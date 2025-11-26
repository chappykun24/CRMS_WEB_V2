================================================================================
                    CRMS WEB V2 - TEST CASES FOR SYSTEM EVALUATION
                    Class Record Management System
================================================================================

This document contains test cases for evaluating the Class Record Management 
System (CRMS) across different user roles. Each test case should be marked as 
"Yes" if the expected result is achieved, or "No" if it fails.

================================================================================
                    TEST CASES FOR THE ADMINISTRATOR
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           Admin logs in securely using their email            Admin dashboard and all system functions [ ]  [ ]
           credentials.                                         appear with full access.

2           Admin can view and manage all users                 All users are listed; CRUD features      [ ]  [ ]
           (faculty, staff, students).                          work correctly.

3           Admin can access and manage all departments,        All academic data is visible and         [ ]  [ ]
           programs, and courses.                               editable.

4           Admin can add, edit, or delete user accounts        User management operations are           [ ]  [ ]
           and assign roles.                                    functional with proper role assignment.

5           Admin generates and exports system-wide reports     Reports with export options (PDF, Excel,  [ ]  [ ]
           (academic, attendance, performance).                 CSV) are generated correctly.

6           Admin can view and manage system settings and       System configuration panel is accessible  [ ]  [ ]
           school configuration.                                and functional.

7           Admin can approve or reject faculty registration    Faculty approval workflow functions      [ ]  [ ]
           requests.                                           correctly.

8           Admin can access analytics and performance          Comprehensive analytics and dashboards    [ ]  [ ]
           dashboards for all departments.                      display correctly.

================================================================================
                    TEST CASES FOR THE FACULTY MEMBER
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           Faculty logs in securely using their email          Faculty dashboard and assigned class    [ ]  [ ]
           credentials.                                         modules are accessible; authentication 
                                                                 is successful.

2           Faculty views and manages their assigned classes    All assigned classes are visible with    [ ]  [ ]
           and courses.                                         proper course information.

3           Faculty records and updates student attendance      Attendance entries are saved correctly   [ ]  [ ]
           in real-time.                                        and reflected immediately in the system.

4           Faculty creates, edits, and manages assessments     Assessment creation and management       [ ]  [ ]
           (quizzes, exams, projects).                          features work as expected.

5           Faculty enters, calculates, and updates student     Grade calculations are accurate and      [ ]  [ ]
           grades.                                              changes are saved properly.

6           Faculty can view student performance analytics      Analytics and reports display correctly  [ ]  [ ]
           and grade distributions.                             for their classes.

7           Faculty submits syllabi for approval.               Syllabus submission workflow functions   [ ]  [ ]
                                                                 correctly.

8           Faculty cannot access admin functions, other        Access control is enforced; unauthorized  [ ]  [ ]
           faculty's classes, or unauthorized data.              features are restricted.

================================================================================
                    TEST CASES FOR THE DEAN
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           Dean logs in securely using their email             Dean dashboard with department-wide      [ ]  [ ]
           credentials.                                         analytics is accessible.

2           Dean views analytics and performance metrics        Department analytics and performance     [ ]  [ ]
           for their department.                                dashboards display correctly.

3           Dean can approve or reject syllabi submitted        Syllabus approval workflow functions    [ ]  [ ]
           by faculty in their department.                      correctly.

4           Dean can view all classes and course performance    Department-wide class and course data    [ ]  [ ]
           within their department.                             is visible.

5           Dean can generate and export department-level       Reports are accurate, filtered for       [ ]  [ ]
           reports.                                             their department, and exportable.

6           Dean cannot access other departments' data or       Access control is enforced; cross-       [ ]  [ ]
           admin-only functions.                                department access is restricted.

================================================================================
                    TEST CASES FOR THE PROGRAM CHAIR
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           Program Chair logs in securely using their email    Program Chair dashboard with program-   [ ]  [ ]
           credentials.                                         specific modules is accessible.

2           Program Chair views and manages courses within      All courses in their program are         [ ]  [ ]
           their program.                                       visible and manageable.

3           Program Chair can approve or reject syllabi for     Syllabus approval workflow functions    [ ]  [ ]
           courses in their program.                            correctly for their program.

4           Program Chair can view student performance and      Program-specific analytics and reports  [ ]  [ ]
           class analytics for their program.                   display correctly.

5           Program Chair can generate and export program-      Reports are accurate, filtered for      [ ]  [ ]
           level reports.                                       their program, and exportable.

6           Program Chair cannot access other programs' data    Access control is enforced; cross-       [ ]  [ ]
           or unauthorized functions.                           program access is restricted.

================================================================================
                    TEST CASES FOR THE STAFF
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           Staff logs in securely using their email           Staff dashboard with assigned modules   [ ]  [ ]
           credentials.                                         is accessible.

2           Staff can view and manage sections and course       Section management features work        [ ]  [ ]
           assignments.                                         correctly.

3           Staff can view student information and records      Student data is visible and accessible  [ ]  [ ]
           within their scope.                                  as per role permissions.

4           Staff can generate and export reports for their     Reports are generated correctly and     [ ]  [ ]
           assigned tasks.                                      exportable.

5           Staff cannot access grading, faculty approval,      Access control is enforced;             [ ]  [ ]
           or admin-only functions.                             unauthorized features are restricted.

================================================================================
                    ADDITIONAL CROSS-ROLE TEST CASES
================================================================================

Task ID    Test Description                                    Expected Result                          Yes   No
--------    -----------------                                   -----------------                         ---   ---
1           All roles can successfully log out from the        System logs out user and redirects      [ ]  [ ]
           system.                                              to login page.

2           Password reset functionality works for all          Password reset emails are sent and      [ ]  [ ]
           user roles.                                          password can be changed successfully.

3           All roles can view their profile information        Profile page displays correctly and     [ ]  [ ]
           and update their account details.                     updates are saved.

4           System displays appropriate error messages          Clear error messages guide users to     [ ]  [ ]
           when operations fail.                                correct actions.

5           System handles concurrent user access without       Multiple users can access the system    [ ]  [ ]
           data conflicts.                                      simultaneously without conflicts.

6           All data export features (PDF, Excel, CSV) work     Export files are generated correctly    [ ]  [ ]
           correctly for all report types.                      and contain accurate data.

7           System maintains data integrity when performing     Data remains consistent and accurate     [ ]  [ ]
           bulk operations (bulk grade entry, attendance).      after bulk operations.

8           System provides proper validation for all input     Invalid inputs are rejected with        [ ]  [ ]
           fields (grades, dates, student IDs).                 appropriate error messages.

================================================================================
                    TEST CASES SUMMARY
================================================================================

Role                    Total Tests      Passed      Failed      Notes
-------------------     -----------      ------      ------      -----
Administrator              [  ]          [  ]        [  ]        ___________
Faculty Member             [  ]          [  ]        [  ]        ___________
Dean                       [  ]          [  ]        [  ]        ___________
Program Chair              [  ]          [  ]        [  ]        ___________
Staff                      [  ]          [  ]        [  ]        ___________
Cross-Role Tests           [  ]          [  ]        [  ]        ___________

OVERALL TEST RESULTS:      [  ]          [  ]        [  ]        ___________

Tester Name: ___________________________________________________________________

Test Date: ______________________________________________________________________

Additional Notes:

_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________
_________________________________________________________________________

================================================================================
                    END OF TEST CASES DOCUMENT
================================================================================
