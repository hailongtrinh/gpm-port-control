import { Fragment, useEffect, useState } from "react";
import { Card } from "antd";
import { Tree } from "antd";
const Profiles = (props) => {
  const { setSelectProfiles, selectProfiles } = props;
  const [profilesData, setProfiles] = useState([]);
  useEffect(() => {
    window.electron.ipcRenderer.send("get-chrome-profiles");

    window.electron.ipcRenderer.on("chrome-profiles", (event, data) => {
      const treeData = data.map((profile) => {
        return {
          title: profile.profileName,
          key: profile.profileName,
          data: profile
        };
      });
      setProfiles(treeData);
    });

    return () => {
      window.electron.ipcRenderer.removeAllListeners("chrome-profiles");
    };
  }, []);

  const onCheck = (checkedKeys, info) => {
    const selectedProfiles = info.checkedNodes.map((node) => node.data);
    setSelectProfiles(selectedProfiles);
  };

  return (
    <Fragment>
      <Card size="small" title="Profile">
        <Tree
          checkable
          selectable={false}
          defaultCheckedKeys={[]}
          onCheck={onCheck}
          treeData={profilesData}
          switcherIcon={false}
        />
      </Card>
    </Fragment>
  );
};

export default Profiles;
