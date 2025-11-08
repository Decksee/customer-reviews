import { type RouteConfig, index, route, prefix, layout } from "@react-router/dev/routes";

export default [
  /*********************** Public Routes ****************************/
  index("routes/home.tsx"),
  route("/feedback", "routes/feedback.tsx"),
  route("/contact", "routes/contact.tsx"),
  route("/suggestion", "routes/suggestion.tsx"),
  route("/thank-you", "routes/thank-you.tsx"),

  // Sync route for feedback session background sync
  route("/sync", "routes/sync.tsx"),
  route("/admin/reports/download/:id", "routes/admin/reports/download.$id.tsx"),
  
  /*********************** Admin Routes ****************************/
  layout("routes/admin-layout.tsx", [
    route("/admin", "routes/admin/index.tsx"),
    route("/admin/employees", "routes/admin/employees/index.tsx"),
    route("/admin/employees/view/:id", "routes/admin/employees/view.tsx"),
    route("/admin/positions", "routes/admin/positions/index.tsx"),
    route("/admin/pharmacy-ratings", "routes/admin/pharmacy-ratings/index.tsx"),
    route("/admin/clients", "routes/admin/clients/index.tsx"),
    route("/admin/statistics", "routes/admin/statistics/index.tsx"),
    route("/admin/reports", "routes/admin/reports/index.tsx"),
    route("/admin/settings", "routes/admin/settings/index.tsx"),
  ]),
  
  /*********************** Authentication Routes ****************************/
  route("/admin/login", "routes/admin/login.tsx"),
  route("/admin/forgot-password", "routes/admin/forgot-password.tsx"),
  route("/admin/reset-password", "routes/admin/reset-password.tsx"),
  route("/admin/logout", "routes/admin/logout.tsx"),

  
  /*********************** Catch all route ****************************/
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
