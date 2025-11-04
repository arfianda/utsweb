// js/script.js
// Full client-side flow:
// - login (sessionStorage.loggedUser)
// - checkout -> create DO -> store in sessionStorage.dataTracking & sessionStorage.userOrders
// - tracking reads session storage + original dataTracking
// - history reads sessionStorage.userOrders
// - admin stok management (edit/delete/add) works on dataKatalogBuku in-memory

document.addEventListener('DOMContentLoaded', ()=>{

  /* ------------ LOGIN --------------- */
  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const pass = document.getElementById('password').value.trim();
      const user = dataPengguna.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
      if(!user){ alert('Email atau password salah'); return; }
      const minimal = {id:user.id, nama:user.nama, email:user.email, role:user.role};
      sessionStorage.setItem('loggedUser', JSON.stringify(minimal));
      // ensure session dataTracking exists (merge original dataTracking into session copy)
      if(!sessionStorage.getItem('dataTracking')){
        sessionStorage.setItem('dataTracking', JSON.stringify(dataTracking || {}));
      }
      // ensure userOrders structure
      if(!sessionStorage.getItem('userOrders')) sessionStorage.setItem('userOrders', JSON.stringify({}));
      window.location.href = 'dashboard.html';
    });
  }

  /* ------------ COMMON: loggedUser check & greeting & logout -------------- */
  const loggedRaw = sessionStorage.getItem('loggedUser');
  const loggedUser = loggedRaw ? JSON.parse(loggedRaw) : null;

  document.querySelectorAll('.logoutBtn').forEach(b => {
    b.addEventListener('click', ()=> {
      sessionStorage.clear();
      window.location.href = 'index.html';
    });
  });

  // on dashboard & other pages, show greeting and adapt menu
  const elGreeting = document.getElementById('greeting');
  if(elGreeting){
    if(!loggedUser){ alert('Silakan login terlebih dahulu'); window.location.href='index.html'; return; }
    // greeting by time
    const h = new Date().getHours();
    let txt = 'Selamat pagi';
    if(h>=11 && h<15) txt='Selamat siang';
    if(h>=15 && h<18) txt='Selamat sore';
    if(h>=18) txt='Selamat malam';
    elGreeting.textContent = txt + ', ' + loggedUser.nama;
    // role badge
    const roleBadge = document.getElementById('roleBadge');
    if(roleBadge) roleBadge.textContent = loggedUser.role;
    // show/hide menu items
    if(loggedUser.role === 'Admin'){
      document.querySelectorAll('.admin-only').forEach(n=> n.style.display='block');
      document.querySelectorAll('.user-only').forEach(n=> n.style.display='none');
    } else {
      document.querySelectorAll('.admin-only').forEach(n=> n.style.display='none');
      document.querySelectorAll('.user-only').forEach(n=> n.style.display='block');
    }
  }

  /* ------------ DASHBOARD data populate ------------- */
  if(document.getElementById('totalCollection')){
    document.getElementById('totalCollection').textContent = dataKatalogBuku.length;
    document.getElementById('totalUsers').textContent = dataPengguna.length;
    let sum=0; dataKatalogBuku.forEach(b=> sum += parseInt(b.stok)||0);
    document.getElementById('stokTersisa').textContent = sum;
    // top books
    const topBooks = document.getElementById('topBooks');
    topBooks.innerHTML='';
    dataKatalogBuku.slice(0,4).forEach(b=>{
      const col = document.createElement('div'); col.className='col-md-3';
      col.innerHTML = `<div class="card p-2 text-center"><img src="${b.cover}" style="height:120px;object-fit:cover"><h6 class="mt-2">${b.namaBarang}</h6><small class="text-muted">${b.jenisBarang}</small></div>`;
      topBooks.appendChild(col);
    });
  }

  /* ------------ STOK (admin) -------------- */
  if(document.getElementById('stokTbody')){
    if(!loggedUser || loggedUser.role!=='Admin'){ alert('Halaman ini untuk Admin.'); window.location.href='index.html'; return; }
    renderStokTable();
    document.getElementById('addStokBtn').addEventListener('click', ()=>{
      const kode = prompt('Kode Barang:'); if(!kode) return;
      const nama = prompt('Nama Barang:','Nama Baru'); if(!nama) return;
      const jenis = prompt('Jenis Barang:','Buku Ajar') || 'Buku Ajar';
      const edisi = prompt('Edisi:','1') || '1';
      const stok = parseInt(prompt('Stok:','0')) || 0;
      const harga = prompt('Harga (contoh Rp 100.000):','Rp 0') || 'Rp 0';
      const cover = prompt('Path cover (contoh img/xxx.jpg):','img/pengantar_komunikasi.jpg') || 'img/pengantar_komunikasi.jpg';
      dataKatalogBuku.push({kodeBarang:kode,namaBarang:nama,jenisBarang:jenis,edisi:edisi,stok:stok,harga:harga,cover:cover});
      renderStokTable();
    });
  }

  /* ------------ CHECKOUT (user) -------------- */
  if(document.getElementById('bookSelect')){
    if(!loggedUser || loggedUser.role!=='User'){ alert('Halaman ini untuk User.'); window.location.href='index.html'; return; }
    // prefill buyer info
    document.getElementById('custName').value = loggedUser.nama;
    document.getElementById('custEmail').value = loggedUser.email;
    // fill book select
    const bookSelect = document.getElementById('bookSelect');
    dataKatalogBuku.forEach(b=>{
      const opt = document.createElement('option'); opt.value = b.kodeBarang; opt.textContent = `${b.namaBarang} — ${b.harga}`;
      bookSelect.appendChild(opt);
    });

    // CART stored in sessionStorage per session
    let CART = sessionStorage.getItem('CART') ? JSON.parse(sessionStorage.getItem('CART')) : [];
    const cartList = document.getElementById('cartList');
    function renderCart(){
      CART = sessionStorage.getItem('CART') ? JSON.parse(sessionStorage.getItem('CART')) : [];
      cartList.innerHTML = '';
      let total = 0;
      CART.forEach((it, idx)=>{
        const row = document.createElement('div'); row.className='d-flex justify-content-between mb-2';
        row.innerHTML = `<div>${it.namaBarang} <small class="text-muted">x${it.q}</small></div><div><button class="btn btn-sm btn-outline-secondary me-2" onclick="decQty(${idx})">-</button><button class="btn btn-sm btn-outline-secondary me-2" onclick="incQty(${idx})">+</button><button class="btn btn-sm btn-outline-danger" onclick="removeItem(${idx})">Hapus</button></div>`;
        cartList.appendChild(row);
        const num = parseInt(it.harga.replace(/[^0-9]/g,''))||0;
        total += num * it.q;
      });
      document.getElementById('cartTotal').textContent = 'Rp ' + total.toLocaleString();
    }
    // helpers available globally for onclick in generated HTML
    window.incQty = function(i){ CART[i].q++; sessionStorage.setItem('CART', JSON.stringify(CART)); renderCart(); }
    window.decQty = function(i){ if(CART[i].q>1) CART[i].q--; else CART.splice(i,1); sessionStorage.setItem('CART', JSON.stringify(CART)); renderCart(); }
    window.removeItem = function(i){ CART.splice(i,1); sessionStorage.setItem('CART', JSON.stringify(CART)); renderCart(); }

    document.getElementById('addToCartBtn').addEventListener('click', ()=>{
      const kode = bookSelect.value; if(!kode) return alert('Pilih buku dulu');
      const book = dataKatalogBuku.find(x=>x.kodeBarang === kode);
      if(!book) return alert('Buku tidak ditemukan');
      const found = CART.find(i=>i.kodeBarang===kode);
      if(found) found.q++; else CART.push({kodeBarang:book.kodeBarang, namaBarang:book.namaBarang, harga:book.harga, q:1});
      sessionStorage.setItem('CART', JSON.stringify(CART));
      renderCart();
    });

    renderCart();

    // Place order -> create DO and save to session dataTracking and userOrders
    document.getElementById('placeOrderBtn').addEventListener('click', ()=>{
      const name = document.getElementById('custName').value.trim();
      const email = document.getElementById('custEmail').value.trim();
      const address = document.getElementById('custAddress').value.trim();
      if(!name || !email || !address) return alert('Lengkapi data pemesan');
      CART = sessionStorage.getItem('CART') ? JSON.parse(sessionStorage.getItem('CART')) : [];
      if(CART.length===0) return alert('Keranjang kosong');
      // compute total numeric from harga strings
      let total = 0;
      CART.forEach(i => total += (parseInt(i.harga.replace(/[^0-9]/g,''))||0) * i.q);
      // generate DO: YYYY + random digits (ensure uniqueness by timestamp)
      const now = new Date();
      const doNum = String(now.getFullYear()) + String(now.getTime()).slice(-6);
      // build perjalanan initial list (minimal)
      const perjalanan = [
        { waktu: now.toISOString().replace('T',' ').split('.')[0], keterangan: 'Pesanan diterima - menunggu proses' }
      ];
      // load session dataTracking, then add
      const sessTracking = JSON.parse(sessionStorage.getItem('dataTracking') || '{}');
      sessTracking[doNum] = {
        nomorDO: doNum,
        nama: name,
        status: 'Dalam Proses',
        ekspedisi: 'JNE', // default demo
        tanggalKirim: now.toISOString().split('T')[0],
        paket: 'SIM-' + doNum.slice(-5),
        total: 'Rp ' + total.toLocaleString(),
        perjalanan: perjalanan
      };
      sessionStorage.setItem('dataTracking', JSON.stringify(sessTracking));
      // store userOrders map { userEmail: [DOs] }
      const ordersMap = JSON.parse(sessionStorage.getItem('userOrders') || '{}');
      const userKey = loggedUser.email;
      if(!ordersMap[userKey]) ordersMap[userKey] = [];
      ordersMap[userKey].push({
        nomorDO: doNum,
        tanggal: now.toISOString().split('T')[0],
        items: CART,
        total: 'Rp ' + total.toLocaleString(),
        status: 'Dalam Proses'
      });
      sessionStorage.setItem('userOrders', JSON.stringify(ordersMap));
      // clear cart and show DO to user
      sessionStorage.removeItem('CART');
      alert('Pemesanan berhasil. Nomor DO: ' + doNum);
      // redirect to tracking page so user dapat lihat DO
      window.location.href = 'tracking.html';
    });
  } // end checkout

  /* ------------ TRACKING page (user) -------------- */
  if(document.getElementById('trackingResult') || document.getElementById('myDOs')){
    if(!loggedUser || loggedUser.role!=='User'){ alert('Halaman ini untuk User.'); window.location.href='index.html'; return; }
    // search DO by input
    document.getElementById('searchDO').addEventListener('click', ()=>{
      const q = document.getElementById('doNumber').value.trim();
      if(!q){ document.getElementById('trackingResult').innerHTML = '<div class="alert alert-warning">Masukkan nomor DO.</div>'; return; }
      const all = JSON.parse(sessionStorage.getItem('dataTracking') || '{}');
      const t = all[q];
      if(!t){ document.getElementById('trackingResult').innerHTML = '<div class="alert alert-danger">DO tidak ditemukan.</div>'; return; }
      renderTrackingDetail(t);
    });

    // render all DOs for this user (from userOrders)
    function renderMyDOs(){
      const ordersMap = JSON.parse(sessionStorage.getItem('userOrders') || '{}');
      const my = ordersMap[loggedUser.email] || [];
      const container = document.getElementById('myDOs');
      container.innerHTML = '';
      if(my.length===0){ container.innerHTML = '<div class="text-muted">Belum ada DO</div>'; return; }
      my.slice().reverse().forEach(o=>{
        const card = document.createElement('div'); card.className='card p-2 mb-2';
        card.innerHTML = `<div class="d-flex justify-content-between"><div><strong>DO: ${o.nomorDO}</strong><div><small>${o.tanggal} • ${o.status}</small></div></div><div><button class="btn btn-sm btn-outline-primary" onclick="viewDO('${o.nomorDO}')">Lihat</button></div></div>`;
        container.appendChild(card);
      });
    }

    // helper to show tracking detail
    window.viewDO = function(doNum){
      const all = JSON.parse(sessionStorage.getItem('dataTracking') || '{}');
      const t = all[doNum];
      if(!t) { alert('DO tidak ditemukan'); return; }
      renderTrackingDetail(t);
    }

    function renderTrackingDetail(t){
      let html = `<div class="card p-3"><h6>Nama: ${t.nama}</h6><p>Status: <strong>${t.status}</strong></p><p>Ekspedisi: ${t.ekspedisi} | Tgl: ${t.tanggalKirim} | Paket: ${t.paket}</p><p>Total: ${t.total}</p><hr>`;
      html += '<ul class="list-group">';
      t.perjalanan.forEach(p=> html += `<li class="list-group-item"><small>${p.waktu}</small><div>${p.keterangan}</div></li>`);
      html += '</ul>';
      // show simulate-update button for demo (status progress)
      html += `<div class="mt-3"><button class="btn btn-sm btn-outline-success" id="simUpdate">Simulate Progress</button></div>`;
      html += `</div>`;
      document.getElementById('trackingResult').innerHTML = html;

      document.getElementById('simUpdate').addEventListener('click', ()=> {
        // simulate progress: append step, update status; when finished move status to Selesai Antar and update userOrders too
        const all = JSON.parse(sessionStorage.getItem('dataTracking') || '{}');
        const entry = all[t.nomorDO];
        const now = new Date();
        entry.perjalanan.push({ waktu: now.toISOString().replace('T',' ').split('.')[0], keterangan: 'Perjalanan: update otomatis (simulasi)' });
        // if more than 3 steps, mark as Selesai
        if(entry.perjalanan.length >= 4){
          entry.status = 'Selesai Antar';
          // update userOrders status too
          const ordersMap = JSON.parse(sessionStorage.getItem('userOrders') || '{}');
          const myOrders = ordersMap[loggedUser.email] || [];
          const o = myOrders.find(x=> x.nomorDO === t.nomorDO);
          if(o) o.status = 'Selesai';
          ordersMap[loggedUser.email] = myOrders;
          sessionStorage.setItem('userOrders', JSON.stringify(ordersMap));
        } else {
          entry.status = 'Dalam Perjalanan';
        }
        all[t.nomorDO] = entry;
        sessionStorage.setItem('dataTracking', JSON.stringify(all));
        renderMyDOs();
        renderTrackingDetail(entry); // re-render
      });
    }

    renderMyDOs();
  }

  /* ------------ HISTORY page (user) -------------- */
  if(document.getElementById('historyList')){
    if(!loggedUser || loggedUser.role!=='User'){ alert('Halaman ini untuk User.'); window.location.href='index.html'; return; }
    const historyList = document.getElementById('historyList');
    function renderHistory(){
      historyList.innerHTML = '';
      const ordersMap = JSON.parse(sessionStorage.getItem('userOrders') || '{}');
      const my = ordersMap[loggedUser.email] || [];
      if(my.length === 0) { historyList.innerHTML = '<div class="text-muted">Belum ada transaksi</div>'; return; }
      my.slice().reverse().forEach(o=>{
        const li = document.createElement('div'); li.className = 'list-group-item';
        li.innerHTML = `<div class="d-flex justify-content-between"><div><strong>DO: ${o.nomorDO}</strong><div><small>${o.tanggal} • ${o.status}</small></div></div><div><strong>${o.total}</strong></div></div><div class="mt-2"><small>Items:</small><ul>${o.items.map(it=>`<li>${it.namaBarang} x${it.q}</li>`).join('')}</ul></div>`;
        historyList.appendChild(li);
      });
    }
    renderHistory();
    // expose renderHistory in global to re-call after updates
    window.refreshHistory = renderHistory;
  }

}); // DOMContentLoaded end
