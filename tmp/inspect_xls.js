import pkg from 'xlsx';
const { readFile, utils } = pkg;

const filePath = 'C:/Users/Jose Luis Marte/fluxia-app/Documentos/IT-1-2020/IT-1-2020.xls';

try {
    const workbook = readFile(filePath);
    console.log("Sheets:", workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = utils.sheet_to_json(sheet, { header: 1 });
        console.log(`\n--- ${sheetName} (first 20 rows) ---`);
        data.slice(0, 50).forEach((row, i) => {
            const rowStr = row.filter(cell => cell !== null && cell !== undefined).join(" | ");
            if (rowStr.trim()) console.log(`${i}: ${rowStr}`);
        });
    });
} catch (err) {
    console.error("Error reading file:", err);
}
