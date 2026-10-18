const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfvGU-9dBbqkpmWQNfPRQdjtm72KXHpoBwiLo5bz_ZsLPemMveiXhU5ff5o8rWtY6i/exec';

let appData = []; 
let totalSaldo = 0;

// ELEMEN PREVIEW GAMBAR
const gambarInput = document.getElementById('gambar');
const imagePreview = document.getElementById('imagePreview');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const fileNameEl = document.getElementById('fileName');

// Logika untuk menampilkan preview gambar saat dipilih
gambarInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        fileNameEl.innerText = file.name;
        // Buat URL sementara untuk memunculkan gambar langsung
        const objectUrl = URL.createObjectURL(file);
        imagePreview.src = objectUrl;
        
        // Munculkan gambar, sembunyikan ikon awan
        imagePreview.classList.remove('hidden');
        uploadPlaceholder.classList.add('hidden');
    } else {
        resetPreview(); // Jika batal memilih, kembalikan ke awal
    }
});

// Fungsi untuk mereset kolom gambar (digunakan saat berhasil submit atau batal)
function resetPreview() {
    gambarInput.value = '';
    imagePreview.src = '';
    imagePreview.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');
    fileNameEl.innerText = 'Ketuk untuk pilih gambar';
}

// Logika untuk menampilkan input kategori manual
document.getElementById('kategori').addEventListener('change', function() {
    const inputManual = document.getElementById('kategoriManual');
    if (this.value === 'Lainnya') {
        inputManual.classList.remove('hidden');
        inputManual.required = true;
    } else {
        inputManual.classList.add('hidden');
        inputManual.required = false;
        inputManual.value = ''; 
    }
});

// PERBAIKAN: Logika pemformatan ribuan dipindah ke SINI (di luar fungsi submit)
document.getElementById('jumlah').addEventListener('input', function(e) {
    let rawValue = this.value.replace(/[^0-9]/g, '');
    if (rawValue) {
        this.value = parseInt(rawValue, 10).toLocaleString('id-ID');
    } else {
        this.value = '';
    }
});

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function formatRupiah(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
}

async function fetchTotal() {
    const totalEl = document.getElementById('totalPengeluaran');
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const result = await response.json();
        
        if (result.status === 'success') {
            totalSaldo = result.total;
            appData = result.data || []; 
            totalEl.innerText = formatRupiah(totalSaldo);
            
            // Panggil fungsi render riwayat ke layar
            renderRiwayat();
        } else {
            totalEl.innerText = 'Rp 0';
        }
    } catch (error) {
        totalEl.innerText = 'Rp -';
        console.error(error);
    }
}

document.addEventListener('DOMContentLoaded', fetchTotal);

// FUNGSI CETAK LAPORAN
document.getElementById('btnCetak').addEventListener('click', () => {
    if (appData.length === 0) {
        Swal.fire('Belum Ada Data', 'Tunggu data selesai dimuat atau isi pengeluaran terlebih dahulu.', 'warning');
        return;
    }

    const now = new Date();
    document.getElementById('printDate').innerText = 'Dicetak pada: ' + now.toLocaleString('id-ID');

    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = ''; 

    appData.forEach((item, index) => {
        let tglStr = item.tanggal;
        try { 
            let d = new Date(item.tanggal);
            if (!isNaN(d.getTime())) { tglStr = d.toLocaleDateString('id-ID'); }
        } catch(e) {}

        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-200 hover:bg-gray-50"; 
        
        tr.innerHTML = `
            <td class="py-4 px-2 text-center text-gray-500">${index + 1}</td>
            <td class="py-4 px-2">${tglStr}</td>
            <td class="py-4 px-2 font-medium">${item.kategori}</td>
            <td class="py-4 px-2 text-gray-600">${item.keterangan}</td>
            <td class="py-4 px-2 text-right font-semibold text-gray-900">${formatRupiah(item.jumlah)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('tableTotal').innerText = formatRupiah(totalSaldo);
    window.print();
});


// Handle Form Submit 
document.getElementById('expenseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Menyimpan...';
    submitBtn.disabled = true;

    const fileInput = document.getElementById('gambar');
    let gambarBase64 = null;
    let namaFile = null;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        gambarBase64 = await getBase64(file);
        namaFile = file.name;
    }

    let kategoriFinal = document.getElementById('kategori').value;
    if (kategoriFinal === 'Lainnya') {
        kategoriFinal = document.getElementById('kategoriManual').value;
    }

    let jumlahBersih = document.getElementById('jumlah').value.replace(/[^0-9]/g, '');

    const payload = {
        tanggal: document.getElementById('tanggal').value,
        kategori: kategoriFinal,
        jumlah: jumlahBersih, 
        keterangan: document.getElementById('keterangan').value,
        gambarBase64: gambarBase64,
        namaFile: namaFile
    };
	
    try {
        const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
      if(result.status === 'success') {
            Swal.fire({ icon: 'success', title: 'Berhasil!', text: 'Dicatat.', confirmButtonColor: '#10b981' });
            document.getElementById('expenseForm').reset();
            
            // Panggil fungsi reset gambar agar preview hilang dan kembali jadi awan
            resetPreview(); 
            
            document.getElementById('totalPengeluaran').innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xl"></i>';
            fetchTotal(); 
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Gagal Menyimpan', text: error.message, confirmButtonColor: '#10b981' });
    } finally {
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-2"></i> Simpan Data';
        submitBtn.disabled = false;
    }
});

// ==========================================
// LOGIKA BANNER INSTALL PWA
// ==========================================
let deferredPrompt;
const pwaBanner = document.getElementById('pwaBanner');
const btnInstall = document.getElementById('btnInstall');
const btnCloseBanner = document.getElementById('btnCloseBanner');

// Dengarkan event dari browser jika PWA siap diinstal
window.addEventListener('beforeinstallprompt', (e) => {
    // Mencegah browser menampilkan prompt default bawah layar (mini-infobar)
    e.preventDefault();
    
    // Simpan event untuk dipanggil nanti saat tombol diklik
    deferredPrompt = e;
    
    // Tampilkan banner custom kita (ubah dari hidden menjadi flex)
    pwaBanner.classList.remove('hidden');
    pwaBanner.classList.add('flex');
});

// Aksi saat tombol "Instal" diklik
btnInstall.addEventListener('click', async () => {
    // Sembunyikan banner
    pwaBanner.classList.add('hidden');
    pwaBanner.classList.remove('flex');
    
    if (deferredPrompt) {
        // Munculkan prompt instalasi bawaan sistem/browser
        deferredPrompt.prompt();
        
        // Tunggu respon pengguna (apakah mereka setuju menginstal?)
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('Pengguna setuju menginstal PWA');
        } else {
            console.log('Pengguna batal menginstal PWA');
        }
        
        // Event hanya bisa dipakai sekali, lalu kosongkan
        deferredPrompt = null;
    }
});

// Aksi saat tombol "X" (Tutup) diklik
btnCloseBanner.addEventListener('click', () => {
    pwaBanner.classList.add('hidden');
    pwaBanner.classList.remove('flex');
});

// Aksi jika aplikasi berhasil terinstal (misal diinstal dari menu browser)
window.addEventListener('appinstalled', () => {
    pwaBanner.classList.add('hidden');
    pwaBanner.classList.remove('flex');
    deferredPrompt = null;
    console.log('PWA berhasil diinstal!');
});

// Fungsi menyuntikkan data ke tabel riwayat di layar utama
function renderRiwayat() {
    const tbody = document.getElementById('riwayatBody');
    tbody.innerHTML = '';
    
    // Loop dari belakang agar data terbaru tampil di atas
    for (let i = appData.length - 1; i >= 0; i--) {
        const item = appData[i];
        
        // Format tanggal untuk tampilan
        let tglStr = item.tanggal;
        let tglRaw = '';
        try { 
            let d = new Date(item.tanggal);
            if (!isNaN(d.getTime())) { 
                tglStr = d.toLocaleDateString('id-ID', {day: 'numeric', month: 'short'});
                tglRaw = d.toISOString().split('T')[0]; // Format YYYY-MM-DD untuk form edit
            }
        } catch(e) {}

        const tr = document.createElement('tr');
        tr.className = "border-b border-gray-50 hover:bg-gray-50"; 
        
// Tombol Edit & Hapus diletakkan bersebelahan menggunakan flex
        tr.innerHTML = `
            <td class="py-3 pr-2 text-xs">${tglStr}</td>
            <td class="py-3 px-2">
                <p class="font-semibold text-gray-800 truncate w-32 md:w-full">${item.keterangan}</p>
                <p class="text-xs text-emerald-500">${item.kategori}</p>
            </td>
            <td class="py-3 px-2 text-right font-medium">${formatRupiah(item.jumlah)}</td>
            <td class="py-3 pl-2 text-center flex justify-center gap-2">
                <button onclick="editData(${item.row}, '${tglRaw}', '${item.kategori}', '${item.keterangan.replace(/'/g, "\\'")}', ${item.jumlah})" class="bg-blue-100 text-blue-600 p-2 rounded-lg hover:bg-blue-200 transition" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteData(${item.row})" class="bg-red-100 text-red-600 p-2 rounded-lg hover:bg-red-200 transition" title="Hapus">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    }
}

// Fungsi memunculkan form edit dan mengirim pembaruan ke Database
async function editData(row, tanggal, kategori, keterangan, jumlah) {
    // Format nominal awal agar saat popup dibuka, angkanya sudah bertitik
    let formattedJumlah = parseInt(jumlah, 10).toLocaleString('id-ID');

    const { value: formValues } = await Swal.fire({
        title: 'Edit Pengeluaran',
        html: `
            <div class="text-left space-y-4 mt-2">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Tanggal</label>
                    <input id="edit-tgl" type="date" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="${tanggal}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Kategori</label>
                    <input id="edit-kat" type="text" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="${kategori}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                    <input id="edit-ket" type="text" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="${keterangan}">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Jumlah (Rp)</label>
                    <!-- Menggunakan type text dan inputmode numeric agar titik bisa dimunculkan -->
                    <input id="edit-jml" type="text" inputmode="numeric" class="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none" value="${formattedJumlah}">
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Simpan Perubahan',
        cancelButtonText: 'Batal',
        
        // Menambahkan fungsi pendeteksi ketikan di dalam popup
        didOpen: () => {
            const editJml = document.getElementById('edit-jml');
            editJml.addEventListener('input', function(e) {
                // Hapus semua karakter selain angka
                let rawValue = this.value.replace(/[^0-9]/g, '');
                if (rawValue) {
                    // Format kembali menjadi angka dengan titik
                    this.value = parseInt(rawValue, 10).toLocaleString('id-ID');
                } else {
                    this.value = '';
                }
            });
        },
        
        preConfirm: () => {
            // Hilangkan titik sebelum dikirim ke database
            let bersihJml = document.getElementById('edit-jml').value.replace(/[^0-9]/g, '');
            return {
                action: 'edit',
                row: row,
                tanggal: document.getElementById('edit-tgl').value,
                kategori: document.getElementById('edit-kat').value,
                keterangan: document.getElementById('edit-ket').value,
                jumlah: bersihJml // Mengirim angka murni tanpa titik
            }
        }
    });

    if (formValues) {
        Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        
        try {
            const response = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(formValues) });
            const result = await response.json();
            
            if(result.status === 'success') {
                Swal.fire('Berhasil!', 'Data telah diperbarui.', 'success');
                // Refresh data layar tanpa me-reload web
                fetchTotal(); 
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// Fungsi untuk menghapus data dengan konfirmasi SweetAlert
async function deleteData(row) {
    const result = await Swal.fire({
        title: 'Hapus Data?',
        text: "Data pengeluaran ini akan dihapus permanen dari Database!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Ya, Hapus!',
        cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        
        try {
            const response = await fetch(APPS_SCRIPT_URL, { 
                method: 'POST', 
                body: JSON.stringify({ action: 'delete', row: row }) 
            });
            const resData = await response.json();
            
            if(resData.status === 'success') {
                Swal.fire('Terhapus!', 'Data pengeluaran berhasil dihapus.', 'success');
                // Tarik ulang data agar tabel dan total saldo langsung ter-update
                fetchTotal(); 
            } else {
                throw new Error(resData.message);
            }
        } catch (error) {
            Swal.fire('Gagal Menghapus', error.message, 'error');
        }
    }
}