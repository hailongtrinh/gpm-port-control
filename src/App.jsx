import { useState, useEffect, Fragment } from "react";
import Profiles from "./components/Profiles";
import Actions from "./components/Actions";
import { Col, Row } from "antd";
function App() {
  const [selectedProfiles, setSelectProfiles] = useState([]);
  return (
    <Fragment>
      <Row>
        <Col span={6}>
          <Profiles
            selectedProfiles={selectedProfiles}
            setSelectProfiles={setSelectProfiles}
          />
        </Col>
        <Col span={18}>
          <Actions />
        </Col>
      </Row>
    </Fragment>
  );
}

export default App;
