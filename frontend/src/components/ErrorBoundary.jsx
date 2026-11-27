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
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#F8FAFC",
            padding: 24,
            fontFamily: "inherit",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E2E8F0",
              borderRadius: 12,
              padding: 32,
              maxWidth: 540,
              width: "100%",
              boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 6,
                background: "#FEE2E2",
                color: "#991B1B",
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Application Render Notice
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>
              Something went wrong loading this view
            </h2>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "#64748B", lineHeight: 1.5 }}>
              An unexpected render issue occurred. You can reload the page or return to the Dashboard.
            </p>
            {this.state.error && (
              <div
                style={{
                  background: "#F1F5F9",
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 12,
                  color: "#334155",
                  fontFamily: "monospace",
                  overflowX: "auto",
                  marginBottom: 20,
                  whiteSpace: "pre-wrap",
                }}
              >
                {this.state.error.toString()}
              </div>
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  background: "#2F6F4F",
                  color: "#FFF",
                  border: "none",
                  borderRadius: 6,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = "/dashboard")}
                style={{
                  background: "#FFF",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  padding: "10px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
