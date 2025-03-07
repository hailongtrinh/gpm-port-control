const PortList = ({ ports }) => {
  return (
    <table
      style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}
    >
      <thead>
        <tr>
          <th style={styles.th}>Profile</th>
          <th style={styles.th}>PID</th>
          <th style={styles.th}>IP</th>
        </tr>
      </thead>
      <tbody>
        {ports.length === 0 ? (
          <tr>
            <td colSpan="3" style={styles.td}>
              Không tìm thấy Chrome đang chạy.
            </td>
          </tr>
        ) : (
          ports.map((port, index) => (
            <tr key={index}>
              <td style={styles.td}>{port.profileName}</td>
              <td style={styles.td}>{port.pid}</td>
              <td style={styles.td}>{port.remoteIP}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
};

const styles = {
  th: { border: "1px solid #ddd", padding: "8px", backgroundColor: "#f4f4f4" },
  td: { border: "1px solid #ddd", padding: "8px" }
};

export default PortList;
