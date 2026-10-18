const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxwuiFyvXz9wMo2-zB1yn9CNDq5dxxNQYikZXOsq4LIfbwJWxRl6WwWpVfSrYMZ8HhR/exec';

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