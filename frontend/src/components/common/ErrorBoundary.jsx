import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DRISHTI Application Error Boundary Caught an Exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetState = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Could not clear storage:", e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          backgroundColor: "#0b223f",
          color: "#f8fafc",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px"
        }}>
          <div style={{
            maxWidth: "680px",
            width: "100%",
            backgroundColor: "#0f172a",
            borderRadius: "12px",
            border: "1px solid #dc2626",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            padding: "32px",
            boxSizing: "border-box"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "44px",
                height: "44px",
                borderRadius: "8px",
                backgroundColor: "rgba(220, 38, 38, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ef4444",
                fontSize: "24px",
                fontWeight: "bold"
              }}>
                ⚠
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#f8fafc" }}>
                  DRISHTI Command Center • System Alert
                </h1>
                <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#94a3b8" }}>
                  Disaster Risk Intelligence & Hazard Tracking Interface
                </p>
              </div>
            </div>

            <div style={{
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              padding: "14px 16px",
              marginBottom: "20px"
            }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#fca5a5" }}>
                Component Rendering Exception
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "#e2e8f0", wordBreak: "break-word" }}>
                {this.state.error?.message || "An unexpected error interrupted the command dashboard interface."}
              </p>
            </div>

            {this.state.error?.stack && (
              <details style={{ marginBottom: "24px" }}>
                <summary style={{
                  fontSize: "12px",
                  color: "#38bdf8",
                  cursor: "pointer",
                  userSelect: "none",
                  fontWeight: "600"
                }}>
                  View Technical Diagnostics
                </summary>
                <pre style={{
                  marginTop: "10px",
                  padding: "12px",
                  backgroundColor: "#020617",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "#cbd5e1",
                  overflowX: "auto",
                  maxHeight: "180px",
                  fontFamily: "'JetBrains Mono', monospace"
                }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={this.handleReload}
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.15s"
                }}
              >
                Reload Command Center
              </button>
              <button
                onClick={this.handleResetState}
                style={{
                  backgroundColor: "transparent",
                  color: "#94a3b8",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                Clear Cache & Restart
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
