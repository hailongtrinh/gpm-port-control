import { useState, useEffect, Fragment } from "react";
import Profiles from "./components/Profiles";
import Actions from "./components/Actions";
import { Col, Row } from "antd";
function App() {
  const [selectedProfiles, setSelectProfiles] = useState([]);
  const [copyData, setCopyData] = useState({});

  useEffect(() => {
    window.electron.ipcRenderer.on("copy-data", (event, data) => {
      setCopyData(data);
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("copy-data");
    };
  }, []);

  return (
    <Fragment>
      <Row>
        <Col span={8}>
          <Profiles
            selectedProfiles={selectedProfiles}
            setSelectProfiles={setSelectProfiles}
            copyData={copyData}
          />
        </Col>
        <Col span={16}>
          <Actions selectedProfiles={selectedProfiles} copyData={copyData} />
        </Col>
      </Row>
    </Fragment>
  );
}

export default App;
