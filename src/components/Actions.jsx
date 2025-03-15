import { DownOutlined } from "@ant-design/icons";
import { Button, Card, Col, Dropdown, Select, Input, Row, Space } from "antd";
import { Fragment, useState } from "react";
import * as XLSX from "xlsx";
import { Checkbox } from "antd";
const Actions = (props) => {
  const { selectedProfiles } = props;
  const [excelData, setExcelData] = useState([]);
  const [pasteButtonList, setPasteButtonList] = useState([]);
  const [navigateUrlValue, setNavigateUrlValue] = useState("");
  const [delayValue, setDelayValue] = useState("");
  const [doActionSerial, setDoActionSerial] = useState(false);
  const [typeSelector, setTypeSelector] = useState("xpath");
  const [typeTarget, setTypeTarget] = useState("");
  const [typeValue, setTypeValue] = useState("");
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
    };
    reader.readAsBinaryString(file);
  };

  const handleActions = (action, actionData = {}) => {
    window.electron.ipcRenderer.send("actions", {
      action,
      doActionSerial,
      delayValue,
      actionData,
      selectedProfiles,
      excelData
    });
  };

  return (
    <Fragment>
      <Card size="small" title="Actions">
        <div
          className="d-flex"
          style={{
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <p
            className="block-title"
            style={{
              whiteSpace: "nowrap"
            }}
          >
            Excel Data
          </p>
          <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
        </div>

        <Row
          style={{
            alignItems: "center"
          }}
        >
          <Col span={8}>
            <p className="block-title">Actions</p>
          </Col>
          <Col span={10}>
            <Checkbox
              onChange={() => {
                setDoActionSerial(!doActionSerial);
              }}
              checked={doActionSerial}
            >
              Do action serial
            </Checkbox>
          </Col>
          {doActionSerial && (
            <Col span={6}>
              <Input
                placeholder="Delay (s)"
                value={delayValue}
                onChange={(e) => {
                  setDelayValue(e.currentTarget.value);
                }}
              />
            </Col>
          )}
        </Row>
        <Row>
          <Col span={12}>
            <p className="sub-title">Tabs</p>
            <div className="d-block">
              <Button
                size="small"
                onClick={() => {
                  handleActions("newtab");
                }}
              >
                New Tab
              </Button>
              <Button
                size="small"
                onClick={() => {
                  handleActions("close_current_tab");
                }}
              >
                Close current tab
              </Button>
            </div>
          </Col>
          <Col span={12}>
            <p className="sub-title">Navigate</p>
            <div className="d-block">
              <Input
                placeholder="Url"
                value={navigateUrlValue}
                onChange={(e) => {
                  setNavigateUrlValue(e.currentTarget.value);
                }}
              />
              <Button
                size="small"
                onClick={() => {
                  handleActions("open_url", {
                    url: navigateUrlValue
                  });
                }}
              >
                Go
              </Button>
              <Button
                size="small"
                onClick={() => {
                  handleActions("open_url", {
                    url: navigateUrlValue,
                    newTab: true
                  });
                }}
              >
                Go new tab
              </Button>
            </div>
          </Col>
        </Row>
        <p className="sub-title">Typing Data</p>
        <Row
          style={{
            marginBottom: "5px"
          }}
        >
          <Col span={7}>
            <Select
              defaultValue="xpath"
              style={{
                width: "90%"
              }}
              onChange={(value) => {
                setTypeSelector(value);
              }}
              options={[
                {
                  value: "xpath",
                  label: "Xpath"
                },
                {
                  value: "id",
                  label: "ID"
                },
                {
                  value: "name",
                  label: "Name"
                },
                {
                  value: "css",
                  label: "CSS"
                }
              ]}
            />
          </Col>
          <Col span={17}>
            <Input
              placeholder="Type target"
              value={typeTarget}
              onChange={(e) => {
                setTypeTarget(e.currentTarget.value);
              }}
            />
          </Col>
        </Row>
        <Row>
          <Col span={24}>
            <Space.Compact
              style={{
                width: "100%"
              }}
            >
              <Input
                placeholder="Typing custom text"
                value={typeValue}
                onChange={(e) => {
                  setTypeValue(e.currentTarget.value);
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  handleActions("typing", {
                    text: typeValue,
                    targetSelector: typeSelector,
                    targetValue: typeTarget
                  });
                }}
              >
                Type
              </Button>
            </Space.Compact>
            {pasteButtonList.map((buttonName, index) => {
              return (
                <Button
                  onClick={() => {
                    handleActions("typing", buttonName);
                  }}
                  size="small"
                  key={index}
                  className="mr-2"
                >
                  {buttonName}
                </Button>
              );
            })}
          </Col>
        </Row>
      </Card>
    </Fragment>
  );
};

export default Actions;
