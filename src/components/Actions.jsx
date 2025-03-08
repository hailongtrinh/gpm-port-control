import { Button, Card, Input } from "antd";
import { Fragment, useState } from "react";
import * as XLSX from "xlsx";
const Actions = (props) => {
  const [excelData, setExcelData] = useState([]);
  const [pasteButtonList, setPasteButtonList] = useState([]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const binaryStr = e.target.result;
      const workbook = XLSX.read(binaryStr, { type: "binary" });

      // Lấy dữ liệu từ sheet đầu tiên
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet);
      const parsedDataArray = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const firstRow = parsedDataArray?.[0] || [];

      setPasteButtonList(firstRow);
      setExcelData(parsedData); // Lưu vào state React
      window.electron.ipcRenderer.send("excel-data", parsedData); // Gửi sang Electron
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Fragment>
      <Card size="small" title="Actions">
        <h4>Excel Data</h4>
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        <h4>Actions</h4>
        <h5>Tabs</h5>
        <div className="d-flex">
          <Button size="sm">New Tab</Button>
          <Button>Close current tab</Button>
        </div>
        <h5>Navigate</h5>
        <div className="d-flex">
          <Input placeholder="Basic usage" />
          <Button>Go</Button>
          <Button>Go on new tab</Button>
        </div>
        <h5>Paste Data</h5>
        {pasteButtonList.map((buttonName, index) => {
          return (
            <Button key={index} className="mr-2">
              {buttonName}
            </Button>
          );
        })}
      </Card>
    </Fragment>
  );
};

export default Actions;
