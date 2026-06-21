/** Central route strings for programmatic navigation. */
export const P = {
  login: '/login',
  signup: '/signup',
  userDashboard: '/user/dashboard',
  userActivity: '/user/activity',
  userDashboardFiles: '/user/dashboard-files',
  userCatalog: '/user/catalog',
  userMaterialDetail: (id) => `/user/materials/${id}`,
  userMaterialView: (id) => `/user/materials/${id}/view`,
  userProfile: '/user/profile',
  adminAnalytics: '/admin/analytics',
  adminBorrows: '/admin/borrows',
  adminBorrowHistory: '/admin/borrow-history',
  adminUsers: '/admin/users',
  adminUserNew: '/admin/users/new',
  adminUserEdit: (id) => `/admin/users/${id}/edit`,
  adminMaterials: '/admin/materials',
  adminMaterialsActions: '/admin/materials/actions',
  adminMaterialsFiles: '/admin/materials/files',
  adminMaterialsAdd: '/admin/materials/add',
  adminMaterialsAddFiles: '/admin/materials/add-files',
  adminMaterialsEdit: (id) => `/admin/materials/${id}/edit`,
  adminSavedHistory: '/admin/saved-history',
  adminMaterialSavedHistory: (id) => `/admin/saved-history?material=${id}`,
  userSaveHistory: '/user/save-history',
  userMaterialSaveHistory: (id) => `/user/save-history?material=${id}`,
}

/** Reset native button chrome for nav rows that replace links */
export const navBtn = 'border-0 bg-yellow cursor-pointer font-inherit'
