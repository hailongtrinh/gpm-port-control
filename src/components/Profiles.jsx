import { SyncOutlined } from "@ant-design/icons";
import { Card, Tree, Checkbox } from "antd";
import { Fragment, useEffect, useRef, useState } from "react";
import "react-perfect-scrollbar/dist/css/styles.css";
import PerfectScrollbar from "react-perfect-scrollbar";

const Profiles = (props) => {
  const { setSelectProfiles, selectProfiles } = props;
  const [profilesData, setProfiles] = useState([]);
  const [checked, setChecked] = useState([]);
  const [isIndeterminate, setIsIndeterminate] = useState(false);
  const [isCheckAll, setIsCheckAll] = useState(false);

  const scrollbarRef = useRef(null);
  const [height, setHeight] = useState(window.innerHeight - 40);

  useEffect(() => {
    refreshChromeProfile();

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

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight - 40);
      if (scrollbarRef.current) {
        scrollbarRef.current.update();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const refreshChromeProfile = () => {
    window.electron.ipcRenderer.send("get-chrome-profiles");
  };

  const onCheck = (checkedKeys, info) => {
    setChecked(checkedKeys);
  };

  useEffect(() => {
    const indeterminate =
      !!checked.length && checked.length < profilesData.length;
    const checkAll =
      profilesData.length > 0 && checked.length === profilesData.length;
    setIsIndeterminate(indeterminate);
    setIsCheckAll(checkAll);

    const selectedProfiles = profilesData
      .filter((profile) => checked.includes(profile.key))
      .map((profile) => profile.data);
    setSelectProfiles(selectedProfiles);
  }, [checked]);

  return (
    <Fragment>
      <Card
        size="small"
        title={
          <Fragment>
            <Checkbox
              indeterminate={isIndeterminate}
              checked={isCheckAll}
              onChange={(e) => {
                const checkedKeys = profilesData.map((profile) => profile.key);
                setChecked(e.target.checked ? checkedKeys : []);
              }}
            >
              Profiles
            </Checkbox>
          </Fragment>
        }
        extra={
          <Fragment>
            <span
              style={{
                cursor: "pointer"
              }}
              onClick={refreshChromeProfile}
            >
              <SyncOutlined />
            </span>
          </Fragment>
        }
      >
        <div
          style={{
            height: height,
            transition: "height 0.3s ease-in-out", // 👈 Hiệu ứng mượt
            overflow: "hidden"
          }}
        >
          <PerfectScrollbar
            ref={scrollbarRef}
            options={{ suppressScrollX: true, wheelPropagation: false }}
          >
            <Tree
              checkable
              selectable={false}
              defaultCheckedKeys={[]}
              onCheck={onCheck}
              treeData={profilesData}
              switcherIcon={false}
              checkedKeys={checked}
            />
          </PerfectScrollbar>
        </div>
      </Card>
    </Fragment>
  );
};

export default Profiles;
