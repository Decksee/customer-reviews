import "react-router";

declare module "react-router" {
  interface Register {
    params: Params;
  }

  interface Future {
    unstable_middleware: false
  }
}

type Params = {
  "/": {};
  "/feedback": {};
  "/contact": {};
  "/suggestion": {};
  "/thank-you": {};
  "/sync": {};
  "/admin/reports/download/:id": {
    "id": string;
  };
  "/admin": {};
  "/admin/employees": {};
  "/admin/employees/view/:id": {
    "id": string;
  };
  "/admin/positions": {};
  "/admin/pharmacy-ratings": {};
  "/admin/clients": {};
  "/admin/statistics": {};
  "/admin/reports": {};
  "/admin/settings": {};
  "/admin/login": {};
  "/admin/forgot-password": {};
  "/admin/reset-password": {};
  "/admin/logout": {};
  "/*": {
    "*": string;
  };
};