import { CloseOutlined, PlusOutlined, SyncOutlined, UploadOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Checkbox,
  Col,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Tooltip
} from "antd";
import { Fragment, useEffect, useState } from "react";

const shortenText = (text, maxLength = 30) => {
  if (text.length <= maxLength) return text;

  const keepLength = Math.floor((maxLength - 3) / 2); // Chia đôi khoảng giữ lại
  return text.slice(0, keepLength) + "..." + text.slice(-keepLength);
};

const Actions = (props) => {
  const { selectedProfiles, copyData } = props;
  const [excelFile, setExcelFile] = useState(false);
  const [excelData, setExcelData] = useState([]);
  const [pasteButtonList, setPasteButtonList] = useState([]);
  const [navigateUrlValue, setNavigateUrlValue] = useState("");
  const [delayValue, setDelayValue] = useState("");
  const [doActionSerial, setDoActionSerial] = useState(false);
  const [pastingMode, setPastingMode] = useState(true);

  const [interactionSelector, setInteractionSelector] = useState("xpath");
  const [interactionTarget, setInteractionTarget] = useState("");

  const [typeSelector, setTypeSelector] = useState("xpath");
  const [typeTarget, setTypeTarget] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [alwayOnTop, setAlwayOnTop] = useState(false);
  const handleFileUpload = (event) => {
    window.electron.ipcRenderer.send("select-file");
  };

  const handleActions = (action, actionData = {}) => {
    window.electron.ipcRenderer.send("actions", {
      action,
      doActionSerial,
      delayValue,
      actionData,
      selectedProfiles
    });
  };

  useEffect(() => {
    window.electron.ipcRenderer.send("get-config");
    window.electron.ipcRenderer.send("reload-excel-file");
    window.electron.ipcRenderer.on("config-data", (event, data) => {
      setAlwayOnTop(data.window?.alwaysOnTop);
    });

    window.electron.ipcRenderer.on("excel-data", (event, data) => {
      setPasteButtonList(data.pasteButtonList);
      setExcelData(data.excelData);
      setExcelFile(data.excelFile);
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("config-data");
      window.electron.ipcRenderer.removeAllListeners("excel-data");
    };
  }, []);

  return (
    <Fragment>
      <Card
        size="small"
        title="Actions"
        extra={
          <Fragment>
            <Switch
              checkedChildren="On top"
              unCheckedChildren="On top"
              checked={alwayOnTop}
              onChange={() => {
                setAlwayOnTop(!alwayOnTop);
                window.electron.ipcRenderer.send("toggle-always-on-top");
              }}
            />
          </Fragment>
        }
      >
        <div
          className="d-flex"
          style={{
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
          {/* <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} /> */}
          {excelFile ? (
            <Fragment>
              <div
                style={{
                  marginLeft: "20px"
                }}
              >
                <Tooltip title={excelFile.path}>
                  {shortenText(excelFile.name)}
                </Tooltip>

                <Tooltip title="Remove file">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setExcelFile(false);
                      setExcelData([]);
                      setPasteButtonList([]);
                      window.electron.ipcRenderer.send("remove-excel-file");
                    }}
                  />
                </Tooltip>
                <Tooltip title="Reload file data">
                  <Button
                    type="dashed"
                    size="small"
                    icon={<SyncOutlined />}
                    onClick={() => {
                      window.electron.ipcRenderer.send("reload-excel-file");
                    }}
                  />
                </Tooltip>
              </div>
            </Fragment>
          ) : (
            <Button
              type="primary"
              icon={<UploadOutlined />}
              size="middle"
              onClick={handleFileUpload}
            />
          )}
        </div>

        <Row
          style={{
            alignItems: "center",
            justifyContent: "space-between"
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
                <PlusOutlined />
              </Button>
              <Button
                size="small"
                onClick={() => {
                  handleActions("close_current_tab");
                }}
              >
                Close tab
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
        <Row
          style={{
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Col span={24}>
            <p className="sub-title">Interaction</p>
          </Col>
        </Row>
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
                setInteractionSelector(value);
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
              placeholder="Target"
              value={interactionTarget}
              onChange={(e) => {
                setInteractionTarget(e.currentTarget.value);
              }}
            />

            <Button
              onClick={() => {
                handleActions("interact", {
                  interactionAction: "copy",
                  interactionSelector: interactionSelector,
                  interactionTarget: interactionTarget
                });
              }}
              size="small"
              className="mr-2"
            >
              Copy text
            </Button>
            <Button
              onClick={() => {
                handleActions("interact", {
                  interactType: "click",
                  targetSelector: interactionSelector,
                  targetValue: interactionTarget
                });
              }}
              size="small"
              className="mr-2"
            >
              Click
            </Button>
            <Button
              onClick={() => {
                handleActions("interact", {
                  interactType: "focus",
                  targetSelector: interactionSelector,
                  targetValue: interactionTarget
                });
              }}
              size="small"
              className="mr-2"
            >
              Focus
            </Button>
          </Col>
        </Row>
        <Row
          style={{
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <Col span={8}>
            <p className="sub-title">Typing Data</p>
          </Col>
          <Col span={10}>
            <Checkbox
              onChange={() => {
                setPastingMode(!pastingMode);
              }}
              checked={pastingMode}
            >
              Pasting mode
            </Checkbox>
          </Col>
        </Row>

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
                    pastingMode,
                    text: typeValue,
                    targetSelector: typeSelector,
                    targetValue: typeTarget
                  });
                }}
              >
                {pastingMode ? "Paste" : "Type"}
              </Button>
            </Space.Compact>
            <Button
              onClick={() => {
                const textData = {};
                for (const profile of selectedProfiles) {
                  const textCopy = copyData?.[profile.profileName] || "";
                  textData[profile.profileName] = textCopy;
                }
                handleActions("typing", {
                  pastingMode,
                  text: textData,
                  targetSelector: typeSelector,
                  targetValue: typeTarget
                });
              }}
              size="small"
              className="mr-2"
            >
              Interaction Text
            </Button>
            {pasteButtonList.map((buttonName, index) => {
              return (
                <Button
                  onClick={() => {
                    const textData = {};
                    for (const profile of selectedProfiles) {
                      const profileData = excelData.find(
                        (data) =>
                          data?.Profile === profile.profileName ||
                          data?.profile === profile.profileName
                      );

                      textData[profile.profileName] = profileData[buttonName];
                    }
                    handleActions("typing", {
                      pastingMode,
                      text: textData,
                      targetSelector: typeSelector,
                      targetValue: typeTarget
                    });
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
