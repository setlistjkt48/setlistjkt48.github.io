# 💳 Setlist JKT48 Membership Checker

Website untuk mengecek sisa durasi membership hanya dengan nomor WhatsApp.
Dibangun menggunakan **Google Apps Script**, **Bootstrap 5**, dan **Google Spreadsheet** sebagai database.

---

## ✨ Fitur
- Cek membership via nomor WhatsApp
- Email disamarkan untuk privasi
- Admin dashboard (login Gmail owner)
- Tambah member & tanggal expired
- Responsive design (Bootstrap)

---

## ⚙️ Setup
1. Buat Google Spreadsheet baru dan beri nama `MemberData`
   Kolom: `NoWhatsApp | Email | ExpiredDate`
2. Copy ID Spreadsheet dan paste ke `Code.gs`
3. Ganti `OWNER_EMAIL` dengan email admin
4. Upload semua file ke Google Apps Script
5. Deploy → Web App → “Anyone”
6. Gunakan URL hasil deploy:
   - `/exec` → halaman cek
   - `/exec?page=admin` → dashboard admin

---

## 📂 Struktur
```
Code.gs
index.html
admin.html
style.css
```
---

💡 Admin: theaterjkt48official@gmail.com
