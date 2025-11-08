

## Test Cases for the Admin

| Task ID | Test Description | Expected Result | Yes | No |
|---------|------------------|-----------------|-----|-----|
| 1 | Admin logs in securely using their email credentials. | Admin dashboard and all system functions appear | | |
| 2 | Admin can view and manage all users (faculty, staff, students). | All users are listed; CRUD features work | | |
| 3 | Admin can access academic records and data for any department or class. | Academic records from any department/class are visible and manageable | | |
| 4 | Admin can add, edit, or delete users and manage user accounts. | User management operations are functional | | |
| 5 | Admin generates and exports system-wide reports (academic, enrollment, attendance). | Reports with export options (PDF, Excel, CSV) are displayed | | |
| 6 | Admin can view and manage system notifications and settings. | System notifications and configuration settings are accessible | | |
| 7 | Admin can approve or reject faculty registration requests and manage faculty access. | Faculty approval/rejection changes are updated in the system | | |

---

## Test Cases for the Faculty

| Task ID | Test Description | Expected Result | Yes | No |
|---------|------------------|-----------------|-----|-----|
| 1 | Faculty logs in securely using their email credentials. | Only their assigned classes and modules are accessible; authentication is successful. | | |
| 2 | Faculty views and monitors their assigned classes and student information. | All assigned classes, student lists, and academic data are visible and current. | | |
| 3 | Faculty records attendance, grades, and updates student assessments. | Changes are reflected instantly in class records; grade calculations and status updates appear correctly. | | |
| 4 | Faculty receives and views notifications relevant to their classes and students. | Notification panel displays timely, class-specific messages and confirms read/unread status. | | |
| 5 | Faculty generates, views, and exports class-level reports (attendance, grades, assessments) by date, student, or class. | Reports are accurate, filtered for their classes only, and available for download (PDF, Excel, CSV). | | |
| 6 | Faculty cannot access, modify, or delete user accounts and does not see system-wide admin tools. | User management, system settings, and cross-department data access are restricted; proper access control is enforced. | | |
| 7 | Faculty accesses dashboard, analytics, and grade modules showing only their own class data. | System gives an error or denies access for any attempt to view or edit other faculty members' class data. | | |

---

## Test Cases for the Staff

| Task ID | Test Description | Expected Result | Yes | No |
|---------|------------------|-----------------|-----|-----|
| 1 | Staff logs in securely using their email credentials. | Staff dashboard with assigned modules (student management, section management, faculty assignment) is accessible; authentication is successful. | | |
| 2 | Staff views and manages student records and information. | All student records, enrollment data, and academic information are visible and manageable. | | |
| 3 | Staff assigns faculty to classes and manages class sections. | Faculty assignments and section configurations are updated correctly in the system. | | |
| 4 | Staff receives and views notifications relevant to student management and section assignments. | Notification panel displays timely, relevant messages for student enrollment, section changes, and related tasks. | | |
| 5 | Staff generates, views, and exports reports related to student management, enrollment, and section assignments. | Reports are accurate and available for download (PDF, Excel, CSV). | | |
| 6 | Staff cannot access system-wide admin tools or modify user roles and permissions. | System settings, user role management, and administrative functions are restricted; proper access control is enforced. | | |
| 7 | Staff can manage student records and section assignments within their authorized scope. | System allows staff to perform assigned tasks while preventing unauthorized access to other departments or administrative functions. | | |

---

## Test Cases for the Dean

| Task ID | Test Description | Expected Result | Yes | No |
|---------|------------------|-----------------|-----|-----|
| 1 | Dean logs in securely using their email credentials. | Dean dashboard with department-wide analytics and management tools are accessible; authentication is successful. | | |
| 2 | Dean views and monitors department-wide academic performance and analytics. | Department analytics, class performance, and academic reports are visible and current. | | |
| 3 | Dean can view and approve syllabi submissions from faculty in their department. | Syllabi approval workflow functions correctly; approval status updates are reflected in the system. | | |
| 4 | Dean receives and views notifications relevant to their department. | Notification panel displays timely, department-specific messages and confirms read/unread status. | | |
| 5 | Dean generates, views, and exports department-level reports (academic performance, enrollment, faculty reports). | Reports are accurate, filtered for their department only, and available for download (PDF, Excel, CSV). | | |
| 6 | Dean cannot access system-wide admin tools or modify system settings beyond their department scope. | System-wide settings and cross-department administrative functions are restricted; proper access control is enforced. | | |
| 7 | Dean can view department analytics and manage faculty within their department. | System allows dean-level access to department data while preventing access to other departments' data. | | |

---

## Test Cases for the Program Chair

| Task ID | Test Description | Expected Result | Yes | No |
|---------|------------------|-----------------|-----|-----|
| 1 | Program Chair logs in securely using their email credentials. | Program Chair dashboard with program-specific analytics and management tools are accessible; authentication is successful. | | |
| 2 | Program Chair views and monitors program-wide course management and academic data. | Program courses, student enrollment, and academic performance data are visible and current. | | |
| 3 | Program Chair can review and manage course submissions and syllabi from faculty in their program. | Course management and syllabus review workflow functions correctly; status updates are reflected in the system. | | |
| 4 | Program Chair receives and views notifications relevant to their program. | Notification panel displays timely, program-specific messages and confirms read/unread status. | | |
| 5 | Program Chair generates, views, and exports program-level reports (course performance, enrollment, student progress). | Reports are accurate, filtered for their program only, and available for download (PDF, Excel, CSV). | | |
| 6 | Program Chair cannot access system-wide admin tools or modify user roles and permissions. | System settings, user management, and administrative functions beyond program scope are restricted; proper access control is enforced. | | |
| 7 | Program Chair can manage c