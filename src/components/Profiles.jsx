import { Fragment, useEffect, useState } from "react";
import { Card } from "antd";
import { Tree } from "antd";
const Profiles = (props) => {
  const [profilesData, setProfiles] = useState([]);

  useEffect(() => {
    window.electron.ipcRenderer.send("get-chrome-profiles");

    window.electron.ipcRenderer.on("chrome-profiles", (event, data) => {
      const treeData = data.map((profile) => {
        console.log(1, profile);

        return {
          title: profile.profileName,
          key: profile.pid,
          data: profile
        };
      });
      setProfiles(treeData);
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("chrome-profiles");
    };
  }, []);

  const onSelect = (selectedKeys, info) => {
    console.log("selected", selectedKeys, info);
  };
  const onCheck = (checkedKeys, info) => {
    console.log("onCheck", checkedKeys, info);
  };

  return (
    <Fragment>
      <Card size="small" title="Profile">
        <Tree
          checkable
          selectable={false}
          defaultCheckedKeys={[]}
          onSelect={onSelect}
          onCheck={onCheck}
          treeData={profilesData}
        />
      </Card>
    </Fragment>
  );
};

export default Profiles;
