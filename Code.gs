function doGet(e) {
  const page = e.parameter.page;
  if (page === "admin") {
    return HtmlService.createHtmlOutputFromFile("admin").setTitle("Admin Dashboard");
  }
  return HtmlService.createHtmlOutputFromFile("index").setTitle("Cek Membership");
}

const SHEET_NAME = "MemberData";
const SPREADSHEET_ID = "1AFf0TUJr0Z3rbNSOFpR2OFKNKl50ioHvelhAlomR7gk";
const OWNER_EMAIL = "theaterjkt48official@gmail.com";

function cekMember(noWa) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === noWa.trim()) {
      const email = data[i][1];
      const expDate = new Date(data[i][2]);
      const today = new Date();
      const diff = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      const hiddenEmail = email.replace(/^(.{3})(.*)(@.*)$/, '$1***$3');
      return {
        noWa: noWa,
        email: hiddenEmail,
        sisaHari: diff > 0 ? diff + " hari lagi" : "Expired"
      };
    }
  }

  return { error: "Nomor tidak ditemukan" };
}

function getAllMembers() {
  const user = Session.getActiveUser().getEmail();
  if (user !== OWNER_EMAIL) throw new Error("Akses ditolak");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const result = [];

  for (let i = 1; i < data.length; i++) {
    const sisa = Math.ceil((new Date(data[i][2]) - new Date()) / (1000 * 60 * 60 * 24));
    result.push({
      noWa: data[i][0],
      email: data[i][1],
      expired: data[i][2],
      sisaHari: sisa
    });
  }
  return result;
}

function addMember(noWa, email, expired) {
  const user = Session.getActiveUser().getEmail();
  if (user !== OWNER_EMAIL) throw new Error("Akses ditolak");

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  sheet.appendRow([noWa, email, expired]);
  return "✅ Data berhasil ditambahkan!";
}
