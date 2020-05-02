if (jQuery) {
    var originalFn = $.fn.data;
    $.fn.data = function() {
        if (arguments[0] !== '$binding')
        return originalFn.apply(this, arguments);
    }
}
var OraSchool = angular.module('OraSchool',['ngRoute','ngFileUpload','ngCookies','ngUpload','ui.autocomplete','angularUtils.directives.dirPagination','timer']).run(function($http,dataFactory,$rootScope,$q,Upload,$timeout,$location) {

    $rootScope.defaultAcademicYear = function() {
        angular.forEach($rootScope.dashboardData.academicYear, function (item) {
            if(item.isDefault == "1"){
                return item.id;
            }
        });
    }
    $rootScope.mm_select_upload = function(files,errFiles){
        if(files == null || files.length == 0){
            $rootScope.media_manager = !$rootScope.media_manager;
            $rootScope.gallery_return_scope();
        }else{
            $rootScope.files = files;
            $rootScope.errFiles = errFiles;
            $rootScope.mm_files_count = 0;
            if($rootScope.allow_multiple == false){
                files_tmp = files;
                files = [];
                files.push(files_tmp);
            }
            angular.forEach(files, function(file) {
                if(typeof file.uploaded == "undefined"){
                    showHideLoad();
                
                    file.upload = Upload.upload({
                        url: 'ml_upload',
                        data: {file: file}
                    });

                    file.upload.then(function (response) {
                        $timeout(function () {
                            $rootScope.mm_files_count ++;
                            file.result = response.data;
                            $rootScope.selected_images.push(response.data.file);
                            if(files.length == $rootScope.mm_files_count){
                                $rootScope.media_manager = !$rootScope.media_manager;
                                $rootScope.gallery_return_scope();
                                showHideLoad(true);
                            }
                        });
                    }, function (response) {
                        if (response.status > 0)
                            $rootScope.errorMsg = response.status + ': ' + response.data;
                    }, function (evt) {
                        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                    });
                }
                
            });
        }
        
    }

    $rootScope.mm_cancel = function(){
        $rootScope.selected_images = [];
        $rootScope.media_manager = !$rootScope.media_manager;
        $rootScope.modalClass = "";
    }

    $rootScope.mm_upload_selected = function(){
        if(!$rootScope.allow_multiple){
            $('.mm_gallery_image_selected').removeClass('mm_gallery_image_selected');
            $rootScope.selected_images = [];
        }
    }

    $rootScope.mm_open = function(){
        $rootScope.selected_images = [];
        $rootScope.gallery_images = [];
        $rootScope.media_manager = !$rootScope.media_manager;
        if($rootScope.show_gallery == true && $rootScope.gallery_images.length == 0){
            dataFactory.httpRequest('ml_upload/load').then(function(data) {
                angular.forEach(data, function(file) {
                    $rootScope.gallery_images.push(file);
                    $rootScope.mm_last_id = file.id;
                });
            });
        }
    }

    $rootScope.mm_load_more = function(){
        $('.mm_load_more_loading').show();
        dataFactory.httpRequest('ml_upload/load/'+$rootScope.mm_last_id).then(function(data) {
            if(data.length < 25){
                $('.mm_load_more').hide();
            }
            angular.forEach(data, function(file) {
                $rootScope.gallery_images.push(file);
                $rootScope.mm_last_id = file.id;
            });
            $('.mm_load_more_loading').hide();
        });
    }

    $rootScope.mm_select_image = function(file,$event){
        var element = angular.element($event.target);
        if( $(element).hasClass('mm_gallery_image_selected') ){
            $(element).removeClass('mm_gallery_image_selected');
            angular.forEach($rootScope.selected_images, function(image, key) {
                if(image.id == file.id){
                    delete $rootScope.selected_images.splice(key,1);
                }
            });
        }else{
            if($rootScope.allow_multiple){
                $rootScope.selected_images.push(file);                
            }else{
                $rootScope.mm_files = null;
                $('.mm_gallery_image_selected').removeClass('mm_gallery_image_selected');
                $rootScope.selected_images = [];
                $rootScope.selected_images.push(file);
            }
            $(element).addClass('mm_gallery_image_selected');
        }
    }

    $rootScope.can = function(perm){
        if($rootScope.dashboardData.perms.indexOf(perm) !== -1) {
            return true
        }
        return false;
    }

});

OraSchool.config(function($logProvider){
    $logProvider.debugEnabled(false);
});

var appBaseUrl = $('base').attr('href');

OraSchool.controller('mainController', function(dataFactory,$rootScope,$route,$scope) {
    $scope.chgAcYearModal = function(){
        $scope.modalTitle = $scope.phrase.chgYear;
        $scope.chgAcYearModalShow = !$scope.chgAcYearModalShow;
    }

    $scope.chgAcYear = function(){
        showHideLoad();
        dataFactory.httpRequest('dashboard/changeAcYear','POST',{},{year:$scope.dashboardData.selectedAcYear}).then(function(data) {
            $scope.chgAcYearModalShow = !$scope.chgAcYearModalShow;
            showHideLoad(true);
            location.reload();
        });
    }

    $scope.savePollVote = function(){
        showHideLoad();
        if($scope.dashboardData.polls.selected === undefined){
            alert($scope.phrase.voteMustSelect);
            showHideLoad(true);
            return;
        }
        dataFactory.httpRequest('dashboard/polls','POST',{},$scope.dashboardData.polls).then(function(data) {
            data = successOrError(data);
            if(data){
                $scope.dashboardData.polls = data;
            }
            showHideLoad(true);
        });
    }

    $scope.adminHasPerm = function(perm){
        return $rootScope.dashboardData.perms.some(function(s) {
            return s.indexOf(perm) > -1;
        });
    }

    $scope.changeTheme = function(theme){
        $('#theme').attr({href: 'assets/css/colors/'+theme+'.css'})
        $rootScope.dashboardData.baseUser.defTheme = theme;

        var updatePost = {'spec':'defTheme','value':theme};
        dataFactory.httpRequest('accountSettings/profile','POST',{},updatePost).then(function(data) {
            response = apiResponse(data,'edit');
        });

        $('#themecolors').on('click', 'a', function(){
            $('#themecolors li a').removeClass('working');
            $(this).addClass('working')
        });
    }

    $scope.changeLang = function(theme){
        var updatePost = {'spec':'defLang','value':theme};
        dataFactory.httpRequest('accountSettings/profile','POST',{},updatePost).then(function(data) {
            response = apiResponse(data,'edit');
        });

        setTimeout(function (){
            location.reload();
        }, 500);
    }

    showHideLoad(true);
});

OraSchool.controller('dashboardController', function(dataFactory,$rootScope,$scope,$sce,$route,$location) 
{
    $scope.showModal = false;
    $scope.userProfileData = function(id)
    {
        dataFactory.httpRequest('dashboard/userData/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    }
});

OraSchool.controller('upgradeController', function(dataFactory,$rootScope,$scope) {
    showHideLoad(true);
});

OraSchool.controller('calenderController', function(dataFactory,$scope) {
    showHideLoad(true);
});

OraSchool.controller('registeration', function(dataFactory,$rootScope,$scope) {
    $scope.views = {};
    $scope.classes = {};
    $scope.views.register = true;
    $scope.form = {};
    $scope.form.studentInfo = [];
    $scope.form.role = "teacher" ;


    dataFactory.httpRequest('register/classes').then(function(data) {
        $scope.classes = data;
        showHideLoad(true);
    });

    $scope.subjectList = function(){
        dataFactory.httpRequest('register/sectionsList','POST',{},{"classes":$scope.form.studentClass}).then(function(data) {
            $scope.sections = data;
        });
    }

    $scope.tryRegister = function(){
        showHideLoad();
        dataFactory.httpRequest('register','POST',{},$scope.form).then(function(data) {
            data = successOrError(data);
            if(data){
                $scope.regId = data.id;
                $scope.changeView("thanks");
            }
            showHideLoad(true);
        });
    }

    $scope.linkStudent = function(){
        $scope.modalTitle = "Link Student";
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert("Min Characters is 3");
            return;
        }
        dataFactory.httpRequest('register/searchStudents/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        if(typeof($scope.form.studentInfo) == "undefined"){
            $scope.form.studentInfo = [];
        }
        do{
            var relationShip = prompt("Please enter relationship", "");
        }while(relationShip == "");
        if (relationShip != null && relationShip != "") {
            $scope.form.studentInfo.push({"student":student.name,"relation":relationShip,"id": "" + student.id + "" });
            $scope.showModalLink = !$scope.showModalLink;
        }
    }

    $scope.removeStudent = function(index){
        var confirmRemove = confirm("Sure remove ?");
        if (confirmRemove == true) {
            for (x in $scope.form.studentInfo) {
                if($scope.form.studentInfo[x].id == index){
                    $scope.form.studentInfo.splice(x,1);
                    $scope.form.studentInfoSer = JSON.stringify($scope.form.studentInfo);
                    break;
                }
            }
        }
    }

    $scope.changeView = function(view){
        if(view == "register" || view == "thanks" || view == "show"){
            $scope.form = {};
        }
        $scope.views.register = false;
        $scope.views.thanks = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('adminsController', function(dataFactory,$rootScope,$scope) {
    $scope.admins = {};
    $scope.roles = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.comVia = ["mail","sms","phone"];
    $scope.form.customPermissions = [];

    $scope.load_admins = function(){
        dataFactory.httpRequest('admins/listAll').then(function(data) {
            $scope.admins = data.admins;
            $scope.roles = data.roles;
            $scope.changeView('list');
            showHideLoad(true);
        });
    }
    $scope.load_admins();

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();
            $scope.load_admins();
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('admins/delete/'+item.id,'POST',{},{}).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.admins.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('admins/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.hasPermission = function(permission){
        var caseNow = $.inArray(permission, $scope.form.customPermissions) > -1;
        return caseNow;
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();
            $scope.load_admins();
        }
        showHideLoad(true);
    }

    $scope.account_status = function(user_id,$index){
        showHideLoad();
        dataFactory.httpRequest('admins/account_status/'+user_id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.admins[$index].account_active = response.account_active;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.comVia = ["mail","sms","phone"];
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('employeesController', function(dataFactory,$rootScope,$scope) {
    $scope.employees = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.comVia = ["mail","sms","phone"];

    $scope.load_data = function(){
        dataFactory.httpRequest('employees/listAll').then(function(data) {
            $scope.employees = data.employees;
            $scope.roles = data.roles;
            $scope.departments = data.departments;
            $scope.designations = data.designations;
            $scope.changeView('list');
            showHideLoad(true);
        });
    }
    $scope.load_data();

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();
            $scope.employees.push(response);
            $scope.load_data();
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('employees/delete/'+item.id,'POST',{},{}).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.employees.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('employees/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();
            $scope.load_data();
        }
        showHideLoad(true);
    }

    $scope.account_status = function(user_id,$index){
        showHideLoad();
        dataFactory.httpRequest('employees/account_status/'+user_id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.employees[$index].account_active = response.account_active;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.comVia = ["mail","sms","phone"];
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('classesController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.teachers = {};
    $scope.dormitory = {};
    $scope.subject = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.feeTypes = {};
    $scope.form = {};

    dataFactory.httpRequest('classes/listAll').then(function(data) {
        $scope.classes = data.classes;
        $scope.teachers = data.teachers;
        $scope.dormitory = data.dormitory;
        $scope.subject = data.subject;
        showHideLoad(true);
    });

    $scope.addClass = function(){
        showHideLoad();
        dataFactory.httpRequest('feeTypes/listAll').then(function(data) {
            $scope.feeTypes = data;
            $scope.changeView('add');
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        $scope.form.allocationValues = $scope.feeTypes;
        dataFactory.httpRequest('classes','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.classes.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('classes/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.classes.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('classes/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('classes/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.classes = apiModifyTable($scope.classes,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('subjectsController', function(dataFactory,$rootScope,$scope) {
    $scope.subjects = {};
    $scope.teachers = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('subjects/listAll').then(function(data) {
        $scope.subjects = data.subjects;
        angular.forEach($scope.subjects, function(value, key) {
            $scope.subjects[key].teacherId = JSON.parse($scope.subjects[key].teacherId);
        });
        $scope.teachers = data.teachers;
        $scope.classes = data.classes;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('subjects','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                response.teacherId = JSON.parse(response.teacherId);
                $scope.subjects.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('subjects/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.subjects.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('subjects/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('subjects/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                response.teacherId = JSON.parse(response.teacherId);
                $scope.subjects = apiModifyTable($scope.subjects,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('teachersController', function(dataFactory,$rootScope,$scope,$sce) {
    $scope.teachers = {};
    $scope.roles = {};
    $scope.teachersTemp = {};
    $scope.totalItemsTemp = {};
    $scope.transports = {};
    $scope.transport_vehicles = {};
    $scope.teachersApproval = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.comVia = ["mail","sms","phone"];
    $scope.importType ;
    $scope.importReview = {};
    $scope.searchInput = {};
    $scope.current_page = 1;

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.comVia = ["mail","sms","phone"];
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.approval = false;
        $scope.views.edit = false;
        $scope.views.import = false;
        $scope.views.reviewImport = false;
        $scope.views[view] = true;
    }

    $scope.import = function(impType){
        $scope.importType = impType;
        $scope.changeView('import');
    };

    $scope.saveImported = function(content){
        content = uploadSuccessOrError(content);
        if(content){
            $scope.importReview = content;
            showHideLoad();
            $scope.changeView('reviewImport');
        }
        showHideLoad(true);
    }

    $scope.reviewImportData = function(){
        showHideLoad();
        dataFactory.httpRequest('teachers/reviewImport','POST',{},{'importReview':$scope.importReview}).then(function(data) {
            content = apiResponse(data);
            if(data.status == "failed"){
                $scope.importReview = content;
                $scope.changeView('reviewImport');
            }else{
                $scope.getResultsPage(1);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.removeImport = function(item,index,importType){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            if(importType == "revise"){
                $scope.importReview.revise.splice(index,1);
            }
            if(importType == "ready"){
                $scope.importReview.ready.splice(index,1);
            }
        }
    }

    $scope.showModal = false;
    $scope.teacherProfile = function(id){
        dataFactory.httpRequest('teachers/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.totalItems = 0;
    $scope.pageChanged = function(newPage) {
        $scope.current_page = newPage;
        $scope.getResultsPage();
    };

    $scope.listUsers = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('teachers/listAll/'+pageNumber).then(function(data) {
            $scope.teachers = data.teachers;
            $scope.transports = data.transports;
            $scope.transport_vehicles = data.transport_vehicles;
            $scope.roles = data.roles;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.searchDB = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('teachers/listAll/'+pageNumber,'POST',{},{'searchInput':$scope.searchInput}).then(function(data) {
            $scope.teachers = data.teachers;
            $scope.transports = data.transports;
            $scope.transport_vehicles = data.transport_vehicles;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.getResultsPage = function(newpage = ""){
        if(newpage != ""){
            $scope.current_page = newpage;
        }
        if ( !jQuery.isEmptyObject($scope.searchInput) ) {
            $scope.searchDB( $scope.current_page );
        }else{
            $scope.listUsers( $scope.current_page );
        }
        $scope.changeView('list');
    }

    $scope.getResultsPage();

    $scope.toggleSearch = function(){
        $('.advSearch').toggleClass('col-0 col-3 hidden',1000);
        $('.listContent').toggleClass('col-12 col-9',1000);
    }

    $scope.resetSearch = function(){
        $scope.searchInput = {};
        $scope.getResultsPage(1);
    }

    $scope.sortItems = function(sortBy){
        showHideLoad();
        dataFactory.httpRequest('teachers/listAll/1','POST',{},{'sortBy':sortBy}).then(function(data) {
            $scope.teachers = data.teachers;
            $scope.totalItems = data.totalItems;
            $rootScope.dashboardData.sort.teachers = sortBy;
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();
            $scope.getResultsPage();
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('teachers/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.teachers.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.account_status = function(user_id,$index){
        showHideLoad();
        dataFactory.httpRequest('teachers/account_status/'+user_id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.teachers[$index].account_active = response.account_active;
            }
            showHideLoad(true);
        });
    }

    $scope.removeLeaderBoard = function(id,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('teachers/leaderBoard/delete/'+id,'POST').then(function(data) {
                response = apiResponse(data,'edit');
                $scope.teachers[index].isLeaderBoard = "";
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('teachers/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();
            $scope.getResultsPage();
        }
        showHideLoad(true);
    }

    $scope.waitingApproval = function(){
        showHideLoad();
        dataFactory.httpRequest('teachers/waitingApproval').then(function(data) {
            $scope.teachersApproval = data;
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.approve = function(id){
        showHideLoad();
        dataFactory.httpRequest('teachers/approveOne/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                for (x in $scope.teachersApproval) {
                    if($scope.teachersApproval[x].id == id){
                        $scope.teachersApproval.splice(x,1);
                    }
                }
            }
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.leaderBoard = function(id,index){
        var isLeaderBoard = prompt($rootScope.phrase.leaderBoardMessage);
        if (isLeaderBoard != null) {
            showHideLoad();
            dataFactory.httpRequest('teachers/leaderBoard/'+id,'POST',{},{'isLeaderBoard':isLeaderBoard}).then(function(data) {
                response = apiResponse(data,'edit');
                $scope.teachers[index].isLeaderBoard = "x";
                showHideLoad(true);
            });
        }
    }

});

OraSchool.controller('studentsController', function(dataFactory,$rootScope,$scope,$sce,$route,$location) {
    $scope.students = {};
    $scope.studentsTemp = {};
    $scope.totalItemsTemp = {};
    $scope.classes = {};
    $scope.sections = {};
    $scope.transports = {};
    $scope.hostel = {};
    $scope.studentsApproval = {};
    $scope.studentMarksheet = {};
    $scope.studentAttendance = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.comVia = ["mail","sms","phone"];
    $scope.userRole ;
    $scope.importType ;
    $scope.importReview;
    $scope.importSections;
    $scope.medViewMode = true;
    $scope.searchInput = {};
    var methodName = $route.current.methodName;
    $scope.current_page = 1;
    $scope.roles = {};
    $scope.add_doc = [];
    $scope.student_categories = [];

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.comVia = ["mail","sms","phone"];
        }
        $scope.views.list = false;
        $scope.views.approval = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.attendance = false;
        $scope.views.marksheet = false;
        $scope.views.import = false;
        $scope.views.reviewImport = false;
        $scope.views.medical = false;
        $scope.views.grad = false;
        $scope.views.admission = false;
        $scope.views[view] = true;
    }

    $scope.listUsers = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('students/listAll/'+pageNumber).then(function(data) {
            $scope.students = data.students ;
            $scope.classes = data.classes ;
            $scope.sections = data.sections ;
            $scope.transports = data.transports ;
            $scope.hostel = data.hostel ;
            $scope.totalItems = data.totalItems
            $scope.userRole = data.userRole;
            $scope.roles = data.roles;
            $scope.student_categories = data.student_categories;
            showHideLoad(true);
        });
    }

    $scope.searchDB = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('students/listAll/'+pageNumber,'POST',{},{'searchInput':$scope.searchInput}).then(function(data) {
            $scope.students = data.students ;
            $scope.classes = data.classes ;
            $scope.sections = data.sections ;
            $scope.transports = data.transports ;
            $scope.hostel = data.hostel ;
            $scope.totalItems = data.totalItems
            $scope.userRole = data.userRole;
            $scope.student_categories = data.student_categories;
            showHideLoad(true);
        });
    }

    $scope.getResultsPage = function(newpage = ""){
        if(newpage != ""){
            $scope.current_page = newpage;
        }
        if ( !jQuery.isEmptyObject($scope.searchInput) ) {
            $scope.searchDB( $scope.current_page );
        }else{
            $scope.listUsers( $scope.current_page );
        }
        $scope.changeView('list');
    }

    $scope.sortItems = function(sortBy){
        showHideLoad();
        dataFactory.httpRequest('students/listAll/1','POST',{},{'sortBy':sortBy}).then(function(data) {
            $scope.students = data.students ;
            $scope.classes = data.classes ;
            $scope.sections = data.sections ;
            $scope.transports = data.transports ;
            $scope.hostel = data.hostel ;
            $scope.totalItems = data.totalItems
            $scope.userRole = data.userRole;
            $scope.student_categories = data.student_categories;
            $rootScope.dashboardData.sort.students = sortBy;
            showHideLoad(true);
        });
    }

    if(methodName == "marksheet"){
        showHideLoad();
        $scope.isStudent = true;
        dataFactory.httpRequest('students/marksheet/0').then(function(content) {
            data = apiResponse(content);

            if(content.status == "failed"){
                $scope.noMarksheet = true;
            }else{
                $scope.studentMarksheet = data;
            }

            $scope.changeView('marksheet');
            showHideLoad(true);
        });
    }else if(methodName == "admission"){
        $scope.add_doc = [];
        showHideLoad();
        dataFactory.httpRequest('students/preAdmission').then(function(data) {
            $scope.classes = data.classes ;
            $scope.sections = data.sections ;
            $scope.transports = data.transports ;
            $scope.hostel = data.hostel ;
            $scope.roles = data.roles;
            $scope.student_categories = data.student_categories;
            $scope.form.parentInfo = [];
            $scope.changeView('admission');
            showHideLoad(true);
        });
    }else{
        $scope.getResultsPage();
    }

    $scope.toggleSearch = function(){
        $('.advSearch').toggleClass('col-0 col-3 hidden',1000);
        $('.listContent').toggleClass('col-12 col-9',1000);
    }

    $scope.resetSearch = function(){
        $scope.searchInput = {};
        $scope.getResultsPage(1);
    }

    $scope.import = function(impType){
        $scope.importType = impType;
        $scope.changeView('import');
    };

    $scope.saveImported = function(content){
        content = uploadSuccessOrError(content);
        if(content){
            $scope.importReview = content.dataImport;
            $scope.importSections = content.sections;
            showHideLoad();
            $scope.changeView('reviewImport');
        }
        showHideLoad(true);
    }

    $scope.reviewImportData = function(){
        showHideLoad();
        dataFactory.httpRequest('students/reviewImport','POST',{},{'importReview':$scope.importReview}).then(function(data) {
            content = apiResponse(data);
            if(data.status == "failed"){
                $scope.importReview = content;
                $scope.changeView('reviewImport');
            }else{
                $scope.getResultsPage('1');
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.removeImport = function(item,index,importType){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            if(importType == "revise"){
                $scope.importReview.revise.splice(index,1);
            }
            if(importType == "ready"){
                $scope.importReview.ready.splice(index,1);
            }
        }
    }

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };
    
    $scope.totalItems = 0;
    $scope.pageChanged = function(newPage) {
        $scope.getResultsPage(newPage);
    };

    $scope.searchSubjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.searchInput.class}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.studentClass}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            $location.path( "/students" );
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('students/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.students.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.account_status = function(user_id,$index){
        showHideLoad();
        dataFactory.httpRequest('students/account_status/'+user_id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.students[$index].account_active = response.account_active;
            }
            showHideLoad(true);
        });
    }

    $scope.removeStAcYear = function(student,acYear,index){
        var confirmRemoveAcYear = confirm($rootScope.phrase.sureRemove);
        if (confirmRemoveAcYear == true) {
            showHideLoad();
            dataFactory.httpRequest('students/acYear/delete/'+student+'/'+acYear,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.form.studentAcademicYears.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        $scope.add_doc = [];
        showHideLoad();
        dataFactory.httpRequest('students/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            $scope.getResultsPage();
        }
        showHideLoad(true);
    }

    $scope.waitingApproval = function(){
        showHideLoad();
        dataFactory.httpRequest('students/waitingApproval').then(function(data) {
            $scope.studentsApproval = data;
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.gradStdList = function(){
        showHideLoad();
        dataFactory.httpRequest('students/gradStdList').then(function(data) {
            $scope.gradStdList = data;
            $scope.changeView('grad');
            showHideLoad(true);
        });
    }

    $scope.approve = function(id){
        showHideLoad();
        dataFactory.httpRequest('students/approveOne/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                for (x in $scope.studentsApproval) {
                    if($scope.studentsApproval[x].id == id){
                        $scope.studentsApproval.splice(x,1);
                    }
                }
            }
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.marksheet = function(id){
        showHideLoad();
        dataFactory.httpRequest('students/marksheet/'+id).then(function(data) {
            data = apiResponse(data);
            if(data){
                $scope.studentMarksheet = data;
                $scope.changeView('marksheet');
            }
            showHideLoad(true);
        });
    }

    $scope.leaderBoard = function(id,index){
        var isLeaderBoard = prompt($rootScope.phrase.leaderBoardMessage);
        if (isLeaderBoard != null) {
            showHideLoad();
            dataFactory.httpRequest('students/leaderBoard/'+id,'POST',{},{'isLeaderBoard':isLeaderBoard}).then(function(data) {
                apiResponse(data,'edit');
                $scope.students[index].isLeaderBoard = "x";
                showHideLoad(true);
            });
        }
    }

    $scope.removeLeaderBoard = function(id,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('students/leaderBoard/delete/'+id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.students[index].isLeaderBoard = "";
                }
                showHideLoad(true);
            });
        }
    }

    $scope.attendance = function(id){
        showHideLoad();
        dataFactory.httpRequest('students/attendance/'+id).then(function(data) {
            $scope.studentAttendance = data;
            $scope.changeView('attendance');
            showHideLoad(true);
        });
    }

    $scope.medicalRead = function(id){
        showHideLoad();
        dataFactory.httpRequest('students/medical/'+id).then(function(data) {
            $scope.medicalInfo = {};
            $scope.medicalInfo.data = data;
            $scope.medicalInfo.userId = id;
            $scope.changeView('medical');
            showHideLoad(true);
        });
    }

    $scope.medicalToggle = function(){
        $scope.medViewMode = !$scope.medViewMode;
    }

    $scope.saveMedical = function(){
        showHideLoad();
        dataFactory.httpRequest('students/medical','POST',{},$scope.medicalInfo).then(function(data) {
            response = apiResponse(data,'edit');
            showHideLoad(true);
        });
    }

    $scope.add_document_row = function(){
        $('.tr_clone').last().clone().insertAfter(".tr_clone:last");
    }

    $scope.add_document_row_edit = function(){
        $scope.add_doc.push({'dd':'dd'});
    }

    $scope.remove_student_docs = function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('students/rem_std_docs','POST',{},{'id':id}).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.form.docs.splice($index,1);
            }
            showHideLoad(true);
        });
    }

    $scope.linkParent = function(){
        $scope.modalTitle = $rootScope.phrase.linkStudentParent;
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkParentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('students/search_parent/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkParentFinish = function(parent){
        do{
            var relationShip = prompt("Please enter relationship", "");
        }while(relationShip == "");

        if (relationShip != null && relationShip != "") {
            $scope.form.parentInfo.push({"parent":parent.name,"relation":relationShip,"id": "" + parent.id + "" });
            $scope.form.parentInfoSer = JSON.stringify($scope.form.parentInfo);
            $scope.showModalLink = !$scope.showModalLink;
        }
    }

    $scope.removeParent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.parentInfo) {
                if($scope.form.parentInfo[x].id == index){
                    $scope.form.parentInfo.splice(x,1);
                    $scope.form.parentInfoSer = JSON.stringify($scope.form.parentInfo);
                    break;
                }
            }
        }
    }
});

OraSchool.controller('student_categories', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.student_categories = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('student_categories/listAll').then(function(data) {
            $scope.student_categories = data.student_categories;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('student_categories','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('student_categories/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.student_categories.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('student_categories/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('student_categories/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('student_categories/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('parentsController', function(dataFactory,$scope,$sce,$rootScope) {
    $scope.stparents = {};
    $scope.stparentsTemp = {};
    $scope.totalItemsTemp = {};
    $scope.stparentsApproval = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.comVia = ["mail","sms","phone"];
    $scope.form.studentInfo = {};
    $scope.importType ;
    $scope.searchResults = {};
    $scope.searchInput = {};
    $scope.roles = {};
    $scope.userRole = $rootScope.dashboardData.role;
    $scope.current_page = 1;

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.comVia = ["mail","sms","phone"];
            $scope.form.studentInfo = [];
        }
        $scope.views.list = false;
        $scope.views.approval = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.import = false;
        $scope.views.reviewImport = false;
        $scope.views[view] = true;
    }

    $scope.import = function(impType){
        $scope.importType = impType;
        $scope.changeView('import');
    };

    $scope.saveImported = function(content){
        content = uploadSuccessOrError(content);
        if(content){
            $scope.importReview = content;
            showHideLoad();
            $scope.changeView('reviewImport');
        }
        showHideLoad(true);
    }

    $scope.reviewImportData = function(){
        showHideLoad();
        dataFactory.httpRequest('parents/reviewImport','POST',{},{'importReview':$scope.importReview}).then(function(data) {
            content = apiResponse(data);
            if(data.status == "failed"){
                $scope.importReview = content;
                $scope.changeView('reviewImport');
            }else{
                $scope.getResultsPage('1');
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.removeImport = function(item,index,importType){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            if(importType == "revise"){
                $scope.importReview.revise.splice(index,1);
            }
            if(importType == "ready"){
                $scope.importReview.ready.splice(index,1);
            }
        }
    }

    $scope.showModal = false;
    $scope.parentProfile = function(id){
        dataFactory.httpRequest('parents/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.listUsers = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('parents/listAll/'+pageNumber).then(function(data) {
            $scope.stparents = data.parents;
            $scope.roles = data.roles;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.searchDB = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('parents/listAll/'+pageNumber,'POST',{},{'searchInput':$scope.searchInput}).then(function(data) {
            $scope.stparents = data.parents;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.getResultsPage = function(newpage = ""){
        if(newpage != ""){
            $scope.current_page = newpage;
        }
        if ( !jQuery.isEmptyObject($scope.searchInput) ) {
            $scope.searchDB($scope.current_page);
        }else{
            $scope.listUsers($scope.current_page);
        }
        $scope.changeView('list');
    }

    $scope.getResultsPage();

    $scope.toggleSearch = function(){
        $('.advSearch').toggleClass('col-0 col-3 hidden',1000);
        $('.listContent').toggleClass('col-12 col-9',1000);
    }

    $scope.resetSearch = function(){
        $scope.searchInput = {};
        $scope.getResultsPage(1);
    }

    $scope.sortItems = function(sortBy){
        showHideLoad();
        dataFactory.httpRequest('parents/listAll/1','POST',{},{'sortBy':sortBy}).then(function(data) {
            $scope.stparents = data.parents;
            $scope.totalItems = data.totalItems;
            $rootScope.dashboardData.sort.teachers = sortBy;
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(data){
        showHideLoad();
        response = apiResponse(data,'add');
        if(data.status == "success"){
            $scope.stparents.push(response);
            $scope.getResultsPage();
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('parents/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.stparents.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.account_status = function(user_id,$index){
        showHideLoad();
        dataFactory.httpRequest('parents/account_status/'+user_id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.stparents[$index].account_active = response.account_active;
            }
            showHideLoad(true);
        });
    }

    $scope.removeStudent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.studentInfo) {
                if($scope.form.studentInfo[x].id == index){
                    $scope.form.studentInfo.splice(x,1);
                    $scope.form.studentInfoSer = JSON.stringify($scope.form.studentInfo);
                    break;
                }
            }
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('parents/'+id).then(function(data) {
            $scope.form = data;
            if(data.parentOf == null || data.parentOf == ''){
                $scope.form.studentInfo = [];
            }else{
                $scope.form.studentInfo = data.parentOf;
            }
            $scope.form.studentInfoSer = JSON.stringify($scope.form.studentInfo);
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.monitorParentChange = function(){
        $scope.form.studentInfoSer = JSON.stringify($scope.form.studentInfo);
    }

    $scope.saveEdit = function(data){
        showHideLoad();
        response = apiResponse(data,'add');
        if(data.status == "success"){
            $scope.getResultsPage();
        }
        showHideLoad(true);
    }

    $scope.waitingApproval = function(){
        showHideLoad();
        dataFactory.httpRequest('parents/waitingApproval').then(function(data) {
            $scope.stparentsApproval = data;
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.approve = function(id){
        showHideLoad();
        dataFactory.httpRequest('parents/approveOne/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                for (x in $scope.stparentsApproval) {
                    if($scope.stparentsApproval[x].id == id){
                        $scope.stparentsApproval.splice(x,1);
                    }
                }
            }
            $scope.changeView('approval');
            showHideLoad(true);
        });
    }

    $scope.linkStudent = function(){
        $scope.modalTitle = $rootScope.phrase.linkStudentParent;
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('parents/search/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        do{
            var relationShip = prompt("Please enter relationship", "");
        }while(relationShip == "");
        if (relationShip != null && relationShip != "") {
            $scope.form.studentInfo.push({"student":student.name,"relation":relationShip,"id": "" + student.id + "" });
            $scope.form.studentInfoSer = JSON.stringify($scope.form.studentInfo);
            $scope.showModalLink = !$scope.showModalLink;
        }
    }

});

OraSchool.controller('newsboardController', function(dataFactory,$routeParams,$sce,$rootScope,$scope) {
    $scope.newsboard = {};
    $scope.newsboardTemp = {};
    $scope.totalItemsTemp = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;

    if($routeParams.newsId){
        showHideLoad();
        dataFactory.httpRequest('newsboard/'+$routeParams.newsId).then(function(data) {
            $scope.form = data;
            $scope.newsTitle = data.newsTitle;
            $scope.newsText = $sce.trustAsHtml(data.newsText);
            $scope.changeView('read');
            showHideLoad(true);
        });
    }else{
        $scope.totalItems = 0;
        $scope.pageChanged = function(newPage) {
            getResultsPage(newPage);
        };

        getResultsPage(1);
    }

    function getResultsPage(pageNumber) {
        if(! $.isEmptyObject($scope.newsboardTemp)){
            dataFactory.httpRequest('newsboard/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                angular.forEach(data.newsboard, function (item) {
                    item.newsText = $sce.trustAsHtml(item.newsText);
                });
                $scope.newsboard = data.newsboard;
                $scope.totalItems = data.totalItems;
            });
        }else{
            dataFactory.httpRequest('newsboard/listAll/'+pageNumber).then(function(data) {
                angular.forEach(data.newsboard, function (item) {
                    item.newsText = $sce.trustAsHtml(item.newsText);
                });
                $scope.newsboard = data.newsboard;
                $scope.userRole = data.userRole;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
        }
    }

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.newsboardTemp)){
                $scope.newsboardTemp = $scope.newsboard ;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.newsboard = {};
            }
            getResultsPage(1);
        }else{
            if(! $.isEmptyObject($scope.newsboardTemp)){
                $scope.newsboard = $scope.newsboardTemp ;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.newsboardTemp = {};
            }
        }
    }

    $scope.saveAdd = function(data){
        showHideLoad();
        
        response = apiResponse(data,'add');
        if(data.status == "success"){
            response.newsText = $sce.trustAsHtml(response.newsText);
            $scope.newsboard.push(response);
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('newsboard/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.newsboard.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('newsboard/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        showHideLoad();

        response = apiResponse(data,'edit');
        if(data.status == "success"){
            response.newsText = $sce.trustAsHtml(response.newsText);
            $scope.newsboard = apiModifyTable($scope.newsboard,response.id,response);
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.fe_status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('newsboard/fe_active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.newsboard[$index].fe_active = response.fe_active;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.newsText = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('libraryController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.library = {};
    $scope.libraryTemp = {};
    $scope.totalItemsTemp = {};
    $scope.views = {};
    $scope.form = {};
    $scope.userRole ;
    var methodName = $route.current.methodName;

    $scope.totalItems = 0;
    $scope.pageChanged = function(newPage) {
        $scope.getResultsPage(newPage);
    };

    $scope.getResultsPage = function(pageNumber) {
        if(! $.isEmptyObject($scope.libraryTemp)){
            dataFactory.httpRequest('library/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.library = data.bookLibrary;
                $scope.totalItems = data.totalItems;
            });
        }else{
            dataFactory.httpRequest('library/listAll/'+pageNumber).then(function(data) {
                $scope.library = data.bookLibrary;
                $scope.totalItems = data.totalItems;
                $scope.userRole = data.userRole;
                showHideLoad(true);
            });
        }
    }

    if(methodName == "subscription"){
        $scope.views.subscription = true;
        showHideLoad(true);
    }else{
        $scope.getResultsPage(1);
        $scope.views.list = true;
    }

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.libraryTemp)){
                $scope.libraryTemp = $scope.library ;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.library = {};
            }
            $scope.getResultsPage(1);
        }else{
            if(! $.isEmptyObject($scope.libraryTemp)){
                $scope.library = $scope.libraryTemp ;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.libraryTemp = {};
            }
        }
    }

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();

            $scope.library.push(response);
            $scope.changeView('list');
            showHideLoad(true);
        }
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('library/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.library.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('library/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();

            $scope.library = apiModifyTable($scope.library,response.id,response);
            $scope.changeView('list');
            showHideLoad(true);
        }
    }


    $scope.search_subscription = function(){
        showHideLoad();
        dataFactory.httpRequest('library/members','POST',{},$scope.form).then(function(data) {
            $scope.subscription_members = data;
            showHideLoad(true);
        });
    }

    $scope.edit_subscription = function(user){
        $scope.user_subscription = user;
        $scope.modalTitle = "Manage Subscription";
        $scope.addSubsModal = !$scope.addSubsModal;        
    }

    $scope.saveUsrSubscription = function(){
        showHideLoad();
        dataFactory.httpRequest('library/members_set','POST',{},{'user':$scope.user_subscription.id,'library_id':$scope.form.library_id}).then(function(data) {
            $scope.addSubsModal = !$scope.addSubsModal;
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.subscription = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('library_issues', function(dataFactory,$sce,$rootScope,$scope,$routeParams,$route) {
    $scope.library_issue = {};
    $scope.books = {};
    $scope.views = {};
    $scope.pageNumber = 1;
    $scope.form = {};
    var methodName = $route.current.methodName;

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views.list_issued = false;
        $scope.views[view] = true;
    }
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.library_issueTemp)){

            showHideLoad();
            dataFactory.httpRequest('library_issues/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.library_issue = data.library_issue;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('library_issues/listAll/'+pageNumber).then(function(data) {
                $scope.library_issue = data.library_issue;
                if( pageNumber == 1){
                    $scope.books = data.books;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.library_issueTemp)){
                $scope.library_issueTemp = $scope.library_issue;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.library_issue = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.library_issueTemp)){
                $scope.library_issue = $scope.library_issueTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.library_issueTemp = {};
            }
        }
    }

    $scope.load_issued_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.library_issueTemp)){

            showHideLoad();
            dataFactory.httpRequest('library_issues/searchIssued/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.library_issue = data.library_issue;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('library_issues/listIssued/'+pageNumber).then(function(data) {
                $scope.library_issue = data.library_issue;
                if( pageNumber == 1){
                    $scope.books = data.books;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.issuedPageChanged = function(newPage) {
        $scope.load_issued_data(newPage);
    };

    $scope.searchIssuedDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.library_issueTemp)){
                $scope.library_issueTemp = $scope.library_issue;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.library_issue = {};
            }
            $scope.load_issued_data(1);
        }else{
            if(! $.isEmptyObject($scope.library_issueTemp)){
                $scope.library_issue = $scope.library_issueTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.library_issueTemp = {};
            }
        }
    }

    if(methodName == "library_return"){
        $scope.changeView('list_issued');
        $scope.load_issued_data();
    }else{
        $scope.changeView('list');
        $scope.load_data();        
    }

    $scope.library_return = function(id){
        $scope.book_id = id;
        $scope.modalTitle = $rootScope.phrase.book_return;
        $scope.show_return_modal = !$scope.show_return_modal;
    }

    $scope.library_return_now = function(){
        showHideLoad();
        dataFactory.httpRequest('library_issues/return/'+$scope.book_id,'POST',{},{'id':$scope.book_id,'ret_date':$scope.form.ret_date}).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.show_return_modal = !$scope.show_return_modal;
                $scope.load_issued_data();
                $scope.changeView('list_issued');
            }
            showHideLoad(true);
        });
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('library_issues','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('library_issues/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.library_issue.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('library_issues/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('library_issues/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('library_issues/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }

    $scope.openSearchModal_user_id = function(){
        $scope.modalTitle = $rootScope.phrase.searchUsers;
        $scope.modalClass = "modal-lg";
        $scope.showUsrSearchModal_user_id = !$scope.showUsrSearchModal_user_id;
    }

    $scope.searchUserButton_user_id = function(){
        var searchAbout = $("#searchLink_user_id").val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest("library_issues/searchUser/"+searchAbout).then(function(data) {
            $scope.searchResults_user_id = data;
        });
    }

    $scope.serachUserFinish_user_id = function(user){
        $scope.form.user_id = [];
        $scope.form.user_id.push({"user":user.name,"id": "" + user.id + "" });
        $scope.form.user_id_ser = JSON.stringify($scope.form.user_id);
        $scope.showUsrSearchModal_user_id = !$scope.showUsrSearchModal_user_id;
    }

    $scope.removeUserSearch_user_id = function(user_id){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.user_id) {
                if($scope.form.user_id[x].id == user_id){
                    $scope.form.user_id.splice(x,1);
                    $scope.form.user_id_ser = JSON.stringify($scope.form.user_id);
                    break;
                }
            }
        }
    }
    
});

OraSchool.controller('accountSettingsController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.account = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.languages = {};
    $scope.languageAllow ;
    var methodName = $route.current.methodName;

    $scope.changeView = function(view){
        if(view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.profile = false;
        $scope.views.email = false;
        $scope.views.password = false;
        $scope.views.invoices = false;
        $scope.views.invoiceDetails = false;
        $scope.views[view] = true;
    }

    if(methodName == "profile"){
        dataFactory.httpRequest('accountSettings/langs').then(function(data) {
            $scope.languages = data.languages;
            $scope.languageAllow = data.languageAllow;
            $scope.layoutColorUserChange = data.layoutColorUserChange;
            showHideLoad(true);
        });
        dataFactory.httpRequest('accountSettings/data').then(function(data) {
            $scope.form = data;
            $scope.oldThemeVal = data.defTheme;
            $scope.defLang = data.defLang;
            $scope.changeView('profile');
            showHideLoad(true);
        });
    }else if(methodName == "email"){
        $scope.form = {};
        $scope.changeView('email');
        showHideLoad(true);
    }else if(methodName == "password"){
        $scope.form = {};
        $scope.changeView('password');
        showHideLoad(true);
    }else if(methodName == "invoices"){
        dataFactory.httpRequest('accountSettings/invoices').then(function(data) {
            $scope.invoices = data.invoices;
            $scope.changeView('invoices');
            showHideLoad(true);
        });
    }

    $scope.seeInvoice = function(id){
        showHideLoad();
        dataFactory.httpRequest('accountSettings/invoices/'+id).then(function(data) {
            $scope.invoice = data;
            $scope.changeView('invoiceDetails');
            showHideLoad(true);
        });
    }

    $scope.payOnline = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/invoice/'+id).then(function(data) {
            $scope.invoice = data;
            $scope.modalTitle = "Pay Invoice Online";
            $scope.payOnlineModal = !$scope.payOnlineModal;
            showHideLoad(true);
        });
    }

    $scope.payOnlineNow = function(id){
        $scope.form.invoice = id;
    }

    $scope.saveEmail = function(){
        if($scope.form.email != $scope.form.reemail){
            alert($rootScope.phrase.mailReMailDontMatch);
        }else{
            showHideLoad();
            dataFactory.httpRequest('accountSettings/email','POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'edit');
                showHideLoad(true);
            });
        }
    }

    $scope.savePassword = function(){
        if($scope.form.newPassword != $scope.form.repassword){
            alert($rootScope.phrase.passRepassDontMatch);
        }else{
            showHideLoad();
            dataFactory.httpRequest('accountSettings/password','POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'edit');
                showHideLoad(true);
            });
        }
    }

    $scope.saveProfile = function(data){
        response = apiResponse(data,'edit');
        if(response){
            if($scope.form.defTheme != $scope.oldThemeVal){
                location.reload();
            }
            if($scope.form.defLang != $scope.defLang){
                location.reload();
            }
            $scope.form = response;
        }
        showHideLoad(true);
    }
});

OraSchool.controller('classScheduleController', function(dataFactory,$rootScope,$scope,$sce) {
    $scope.classes = {};
    $scope.makeclassess = [];
    $scope.subject = {};
    $scope.days = {};
    $scope.classSchedule = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;

    dataFactory.httpRequest('classschedule/listAll').then(function(data) 
    {
        $scope.classes = data.classes;
        for (let [key, value] of Object.entries(data.classes)) 
        {
            $scope.makeclassess.push({'id':key,'className':value });
        }
        $scope.subject = data.subject;
        $scope.teachers = data.teachers;
        $scope.sections = data.sections;
        $scope.class_id = data.class_id;
        $scope.section_id = data.section_id;
        $scope.userRole = data.userRole;
        $scope.days = data.days;
        showHideLoad(true);
    });

    $scope.sectionsList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classid}).then(function(data) {
            $scope.makesections = data.sections;
        });
    }


    $scope.isSectionSelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.edit = function(class_id,section_id){
        if(typeof section_id == "undefined"){
            $scope.selected_class = class_id;
            $scope.selected_section = section_id;

            $scope.query_id = class_id;
        }else{
            $scope.selected_class = class_id;
            $scope.selected_section = section_id;
        
            $scope.query_id = section_id;
        }
        
        showHideLoad();
        dataFactory.httpRequest('classschedule/'+$scope.query_id).then(function(data) {
            $scope.classSchedule = data;
            $scope.classId = $scope.query_id;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.removeSub = function(id,day){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('classschedule/delete/'+$scope.classId+'/'+id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    for (x in $scope.classSchedule.schedule[day].sub) {
                        if($scope.classSchedule.schedule[day].sub[x].id == id){
                            $scope.classSchedule.schedule[day].sub.splice(x,1);
                        }
                    }
                }
                showHideLoad(true);
            });
        }
    }

    $scope.addSubOne = function(day){
        $scope.form = {};
        $scope.form.dayOfWeek = day;

        $scope.modalTitle = $rootScope.phrase.addSch;
        $scope.scheduleModal = !$scope.scheduleModal;
    }

    $scope.addClassSchedule = function()
    {
        $scope.form = {};
        $scope.modalTitle = $rootScope.phrase.addSch;
        $scope.addClassScheduleModal = !$scope.addClassScheduleModal;
    }

    $scope.saveAddSub = function(){
        showHideLoad();
        dataFactory.httpRequest('classschedule/'+$scope.form.classid,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                if(typeof $scope.classSchedule.schedule[response.dayOfWeek].sub == "undefined"){
                    $scope.classSchedule.schedule[response.dayOfWeek].sub = [];
                }
                $scope.classSchedule.schedule[response.dayOfWeek].sub.push({"id":response.id,"classId":response.classId,"subjectId":response.subjectId,"start":response.startTime,"end":response.endTime});
            }
            $scope.addClassScheduleModal = !$scope.addClassScheduleModal;
            showHideLoad(true);
        });
    }
    $scope.editSubOne = function(id,day){
        showHideLoad();
        $scope.form = {};
        dataFactory.httpRequest('classschedule/sub/'+id).then(function(data) {
            $scope.form = data;
            $scope.oldDay = day;

            $scope.modalTitle = $rootScope.phrase.editSch;
            $scope.scheduleModalEdit = !$scope.scheduleModalEdit;
            showHideLoad(true);
        });
    }

    $scope.saveEditSub = function(id){
        showHideLoad();
        dataFactory.httpRequest('classschedule/sub/'+id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                for (x in $scope.classSchedule.schedule[$scope.oldDay].sub) {
                    if($scope.classSchedule.schedule[$scope.oldDay].sub[x].id == id){
                        $scope.classSchedule.schedule[$scope.oldDay].sub.splice(x,1);
                    }
                }
                if(typeof $scope.classSchedule.schedule[response.dayOfWeek].sub == "undefined"){
                    $scope.classSchedule.schedule[response.dayOfWeek].sub = [];
                }
                $scope.classSchedule.schedule[response.dayOfWeek].sub.push({"id":response.id,"classId":response.classId,"subjectId":response.subjectId,"start":response.startTime,"end":response.endTime});
            }
            $scope.scheduleModalEdit = !$scope.scheduleModalEdit;
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.editSub = false;
        $scope.views.addSub = false;
        $scope.views[view] = true;
    }
});


OraSchool.controller('settingsController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.views = {};
    $scope.form = {};
    $scope.languages = {};
    $scope.newDayOff ;
    var methodName = $route.current.methodName;
    $scope.oldThemeVal;

    $scope.changeView = function(view){
        $scope.views.settings = false;
        $scope.views.terms = false;
        $scope.views[view] = true;
    }

    if(methodName == "settings"){
        dataFactory.httpRequest('siteSettings/langs').then(function(data) {
            $scope.languages = data.languages;
            showHideLoad(true);
        });
        dataFactory.httpRequest('siteSettings/siteSettings').then(function(data) {
            $scope.form = data.settings;
            $scope.timezone_list = data.timezone_list;
            $scope.formS = data.smsProvider;
            $scope.formM = data.mailProvider;
            $scope.oldThemeVal = $scope.form.layoutColor;
            $scope.globalcalendars = data.globalcalendars;
            $scope.biometric_device_status = data.biometric_device_status;
            showHideLoad(true);
        });
        $scope.changeView('settings');
    }else if(methodName == "terms"){
        dataFactory.httpRequest('siteSettings/terms').then(function(data) {
            $scope.form = data;
            showHideLoad(true);
        });
        $scope.changeView('terms');
    }

    $scope.isDaySelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.officialVacationDayAdd = function(){
        if($scope.newDayOff == '' || typeof $scope.newDayOff === "undefined"){ return; }
        $scope.form.officialVacationDay.push($scope.newDayOff);
    }

    $scope.removeVacationDay = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            $scope.form.officialVacationDay.splice(index,1);
        }
    }

    $scope.moduleActivated = function(module){
        return $.inArray(module, $scope.form.activatedModules) > -1;
    }

    $scope.saveEdit = function(){
        showHideLoad();
        $scope.form.smsProvider = $scope.formS;
        $scope.form.mailProvider = $scope.formM;
        dataFactory.httpRequest('siteSettings/siteSettings','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            location.reload();
            showHideLoad(true);
        });
    }

    $scope.saveTerms = function(){
        showHideLoad();
        dataFactory.httpRequest('siteSettings/terms','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            showHideLoad(true);
        });
    }

    $scope.test_mail_function = function(){
        $scope.modalTitle = "Test Mail Function";
        $scope.test_mail_function_modal = !$scope.test_mail_function_modal;
        $scope.testmailform = {};
    }

    $scope.test_mail_function_action = function(){
        showHideLoad();
        dataFactory.httpRequest('siteSettings/test_mail_function','POST',{},$scope.testmailform).then(function(server_response) {
            alert("Server Response : " + server_response.message);
            $scope.test_mail_function_modal = !$scope.test_mail_function_modal;
            showHideLoad(true);
        });
    }

    $scope.test_sms_function = function(){
        $scope.modalTitle = "Test SMS Function";
        $scope.test_sms_function_modal = !$scope.test_sms_function_modal;
        $scope.testsmsform = {};
    }

    $scope.test_sms_function_action = function(){
        showHideLoad();
        dataFactory.httpRequest('siteSettings/test_sms_function','POST',{},$scope.testsmsform).then(function(server_response) {
            alert("Server Response : " + server_response.message);
            $scope.test_sms_function_modal = !$scope.test_sms_function_modal;
            showHideLoad(true);
        });
    }

});

OraSchool.controller('attendanceController', function(dataFactory,$scope) {
    $scope.classes = {};
    $scope.attendanceModel;
    $scope.subjects = {};
    $scope.views = {};
    $scope.form = {};
    $scope.userRole ;
    $scope.class = {};
    $scope.subject = {};
    $scope.students = {};

    dataFactory.httpRequest('attendance/data').then(function(data) {
        $scope.classes = data.classes;
        $scope.subjects = data.subject;
        $scope.attendanceModel = data.attendanceModel;
        $scope.userRole = data.userRole;
        $scope.changeView('list');
        showHideLoad(true);
    });

    $scope.selectAll = function(type){
        if ($scope.selectedAll) {
            $scope.selectedAll = true;
        } else {
            $scope.selectedAll = false;
        }
        angular.forEach($scope.students, function (item) {
            item.attendance = type;
        });
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subjects = data.subjects;
            $scope.sections = data.sections;
        });
    }

    $scope.startAttendance = function(){
        showHideLoad();
        dataFactory.httpRequest('attendance/list','POST',{},$scope.form).then(function(data) {
            $scope.class = data.class;
            if(data.subject){
                $scope.subject = data.subject;
            }
            $scope.students = data.students;
            $scope.changeView('lists');
            showHideLoad(true);
        });
    }

    $scope.saveAttendance = function(){
        showHideLoad();
        $scope.form.classId = $scope.class.id;
        $scope.form.attendanceDay = $scope.form.attendanceDay;
        $scope.form.stAttendance = $scope.students;
        if($scope.subject.id){
            $scope.form.subject = $scope.subject.id;
        }
        dataFactory.httpRequest('attendance','POST',{},$scope.form).then(function(data) {
            apiResponse(data,'add');
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.lists = false;
        $scope.views.edit = false;
        $scope.views.editSub = false;
        $scope.views.addSub = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('attendance_reportController', function(dataFactory,$scope,$rootScope) {
    $scope.classes = {};
    $scope.attendanceModel;
    $scope.subjects = {};
    $scope.views = {};
    $scope.form = {};
    $scope.userRole ;
    $scope.class = {};
    $scope.subject = {};
    $scope.students = {};

    dataFactory.httpRequest('attendance/data').then(function(data) {
        $scope.classes = data.classes;
        $scope.subjects = data.subject;
        $scope.attendanceModel = data.attendanceModel;
        $scope.changeView('list');
        showHideLoad(true);
    });

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subjects = data.subjects;
            $scope.sections = data.sections;
        });
    }

    $scope.generateReport = function(){
        showHideLoad();
        dataFactory.httpRequest('attendance/report','POST',{},$scope.form).then(function(data) {
            $scope.students = data.students;
            $scope.date_range = data.date_range;
            $scope.class = data.class;
            $scope.subject = data.subject;
            $scope.changeView('report');
            showHideLoad(true);
        });
    }

    $scope.firstChunk = function(textdata){
        var splitted = textdata.split("/");
        if($rootScope.dashboardData.dateformat == "m/d/Y"){
            return splitted[1];
        }
        if($rootScope.dashboardData.dateformat == "d/m/Y"){
            return splitted[0];
        }
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.report = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('staffAttendanceController', function(dataFactory,$scope) {
    $scope.views = {};
    $scope.form = {};
    $scope.views.list = true;
    $scope.teachers = {};

    showHideLoad(true);
    $scope.startAttendance = function(){
        showHideLoad();
        dataFactory.httpRequest('sattendance/list','POST',{},$scope.form).then(function(data) {
            $scope.teachers = data.teachers;
            if(typeof data.InOut != "undefined"){
                $scope.form.InOut = data.InOut;
            }
            $scope.changeView('lists');
            showHideLoad(true);
        });
    }

    $scope.selectAll = function(type){
        if ($scope.selectedAll) {
            $scope.selectedAll = true;
        } else {
            $scope.selectedAll = false;
        }
        angular.forEach($scope.teachers, function (item) {
            item.attendance = type;
        });
    }

    $scope.saveAttendance = function(){
        showHideLoad();
        $scope.form.attendanceDay = $scope.form.attendanceDay;
        $scope.form.stAttendance = $scope.teachers;
        dataFactory.httpRequest('sattendance','POST',{},$scope.form).then(function(data) {
            apiResponse(data,'add');
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.lists = false;
        $scope.views.edit = false;
        $scope.views.editSub = false;
        $scope.views.addSub = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('staffAttendance_reportController', function(dataFactory,$scope,$rootScope) {
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.employees = {};

    showHideLoad(true);

    $scope.generateReport = function(){
        showHideLoad();
        dataFactory.httpRequest('sattendance/report','POST',{},$scope.form).then(function(data) {
            $scope.employees = data.employees;
            $scope.date_range = data.date_range;
            $scope.changeView('report');
            showHideLoad(true);
        });
    }

    $scope.firstChunk = function(textdata){
        var splitted = textdata.split("/");
        if($rootScope.dashboardData.dateformat == "m/d/Y"){
            return splitted[1];
        }
        if($rootScope.dashboardData.dateformat == "d/m/Y"){
            return splitted[0];
        }
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.report = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('reportsController', function(dataFactory,$rootScope,$scope,$http,$sce) {
    $scope.views = {};
    $scope.form = {};
    $scope.views.list = true;
    $scope.stats = {};

    showHideLoad(true);
    $scope.usersStats = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'usersStats'}).then(function(data) {
            $scope.stats = data;
            $scope.changeView('usersStats');
            showHideLoad(true);
        });
    }

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        console.log(id);
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.teacherProfile = function(id){
        dataFactory.httpRequest('teachers/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subjects = data.subjects;
            $scope.sections = data.sections;
        });
    }

    $scope.stdAttendance = function(){
        dataFactory.httpRequest('attendance/stats').then(function(data) {
            $scope.attendanceStats = data;
            $scope.changeView('stdAttendance');
            showHideLoad(true);
        });
    }

    $scope.statsAttendance = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'stdAttendance','data':$scope.form}).then(function(data) {
            if(data){
                $scope.attendanceData = data;
                $scope.changeView('stdAttendanceReport');
            }
            showHideLoad(true);
        });
    }

    $scope.statsAttendanceExport = function(exportType){
        showHideLoad();
        $scope.form.exportType = exportType;
        $http.post('reports', {'stats':'stdAttendance','data':$scope.form},{responseType: 'arraybuffer'}).success(function(data) {

            if(exportType == "excel"){
                var file = new Blob([ data ], {type : 'application/excel'});
                var fileURL = URL.createObjectURL(file);
                var a         = document.createElement('a');
                a.href        = fileURL;
                a.target      = '_blank';
                a.download    = 'StudentsAttendance.xls';
                document.body.appendChild(a);
                a.click();
            }

            if(exportType == "pdf"){
                var file = new Blob([data], {type : 'application/pdf'});
                var fileURL = URL.createObjectURL(file);
                window.open(fileURL);
            }

            showHideLoad(true);
        });
    }

    $scope.staffAttendance = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'stfAttendance','data':$scope.form}).then(function(data) {
            if(data){
                $scope.attendanceData = data;
                $scope.changeView('stfAttendanceReport');
            }
            showHideLoad(true);
        });
    }

    $scope.staffAttendanceExport = function(exportType){
        showHideLoad();
        $scope.form.exportType = exportType;
        $http.post('reports', {'stats':'stfAttendance','data':$scope.form},{responseType: 'arraybuffer'}).success(function(data) {

            if(exportType == "excel"){
                var file = new Blob([ data ], {type : 'application/excel'});
                var fileURL = URL.createObjectURL(file);
                var a         = document.createElement('a');
                a.href        = fileURL;
                a.target      = '_blank';
                a.download    = 'StaffAttendance.xls';
                document.body.appendChild(a);
                a.click();
            }

            if(exportType == "pdf"){
                var file = new Blob([data], {type : 'application/pdf'});
                var fileURL = URL.createObjectURL(file);
                window.open(fileURL);
            }

            showHideLoad(true);
        });
    }

    $scope.getVacation = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'stdVacation','data':$scope.form}).then(function(data) {
            if(data){
                $scope.vacationData = data;
                $scope.changeView('vacationList');
            }
            showHideLoad(true);
        });
    }

    $scope.removeVacation = function(id,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('vacation/delete/'+id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.vacationData.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.gettVacation = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'stfVacation','data':$scope.form}).then(function(data) {
            if(data){
                $scope.vacationData = data;
                $scope.changeView('vacationList');
            }
            showHideLoad(true);
        });
    }

    $scope.getPayments = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'payments','data':$scope.form}).then(function(data) {
            if(data){
                $scope.payments = data;
                $scope.changeView('paymentsResult');
            }
            showHideLoad(true);
        });
    }

    $scope.getExpenses = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'expenses','data':$scope.form}).then(function(data) {
            if(data){
                $scope.expenses = data;
                $scope.changeView('expensesReportsResults');
            }
            showHideLoad(true);
        });
    }

    $scope.getIncome = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'income','data':$scope.form}).then(function(data) {
            if(data){
                $scope.incomes = data;
                $scope.changeView('incomeReportsResults');
            }
            showHideLoad(true);
        });
    }

    $scope.marksheetGenerationPrepare = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'marksheetGenerationPrepare','data':$scope.form}).then(function(data) {
            if(data){
                $scope.classes = data.classes;
                $scope.exams = data.exams;
                $scope.changeView('marksheetGeneration');
            }
            showHideLoad(true);
        });
    }

    $scope.biometricUsers = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'biometric_users'}).then(function(data) {
            if(data){
                $scope.biometric_users = data;
                $scope.changeView('biometric_users_table');
            }
            showHideLoad(true);
        });
    }

    $scope.getPayroll = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'payroll','data':$scope.form}).then(function(data) {
            if(data){
                $scope.payrollPayment_list = data;
                $scope.changeView('payRollReportsResults');
            }
            showHideLoad(true);
        });
    }

    $scope.genCertPrep = function(){
        showHideLoad();
        dataFactory.httpRequest('reports/preCert').then(function(data) {
            $scope.classes = data.classes;
            $scope.certs = data.certs;
            $scope.changeView('gen_cert');
            showHideLoad(true);
        });
    }

    $scope.certGetStdList = function(){
        showHideLoad();
        dataFactory.httpRequest('reports/certGetStdList','POST',{},$scope.form).then(function(data) {
            if(data){
                $scope.certUsersList = data;
            }
            if($scope.certUsersList.length == 0){
                alert($rootScope.phrase.noMatches);
            }
            showHideLoad(true);
        });
    }

    $scope.printCertificate = function(){
        showHideLoad();
        dataFactory.httpRequest('reports','POST',{},{'stats':'certPrint','data':$scope.form}).then(function(data) {
            if(data){
                $scope.printCertInfo = data;
                console.log(data);
                setTimeout(function() { 

                    var mywindow = window.open('', 'new div', 'height=800,width=1200');
                    mywindow.document.write('<html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>Print Certificates</title>');
                    mywindow.document.write('<link rel="stylesheet" href="assets/plugins/bootstrap/css/bootstrap.min.css" type="text/css" /><style> @media print { .no-print, .no-print * { display: none !important; } }</style>');
                    mywindow.document.write('</head><body ><center><div class="no-print" style="padding:10px"><button type="button" onClick="window.print();">Print Certificates</button></div></center>');
                    mywindow.document.write($('#printableArea').html());
                    mywindow.document.write('</body></html>');
                    return true;

                }, 500);

            }
            else
            {
                alert('Fees pending');
            }
            showHideLoad(true);
        });
    }

    $scope.processvars = function(template,userData){
        template = template.replace("[user_name]", userData.user_name);
        template = template.replace("[full_name]", userData.full_name);
        template = template.replace("[email]", userData.email);
        template = template.replace("[date_of_birth]", userData.date_of_birth);
        template = template.replace("[gender]", userData.gender);
        template = template.replace("[religion]", userData.religion);
        template = template.replace("[phone_number]", userData.phone_number);
        template = template.replace("[mobile_number]", userData.mobile_number);
        template = template.replace("[address]", userData.address);
        template = template.replace("[admission_number]", userData.admission_number);
        template = template.replace("[admission_date]", userData.admission_date);
        template = template.replace("[roll_id]", userData.roll_id);
        template = template.replace("[birth_date]", userData.birth_date);
        template = template.replace("[birth_place]", userData.birth_place);
        template = template.replace("[date]", userData.date);
        template = template.replace("[serial_number]", userData.serial_number);
        template = template.replace("[caste]", userData.caste);
        template = template.replace("[birth_district]", userData.birth_district);
        template = template.replace("[birth_state]", userData.birth_state);
        template = template.replace("[admission_class]", userData.admission_class);
        template = template.replace("[udise_number]", userData.udise_number);
        template = template.replace("[subjects]", userData.subjects);
        template = template.replace("[result]", userData.result);
        template = template.replace("[left_reason]", userData.left_reason);
        template = template.replace("[left_date]", userData.left_date);
        template = template.replace("[left_class]", userData.left_class);
        template = template.replace("[remark]", userData.remark);
        template = template.replace("[student_academic_year]", userData.student_academic_year);
        template = template.replace("[student_category]", userData.student_category);
        template = template.replace("[class_name]", userData.class_name);
        template = template.replace("[section_name]", userData.section_name);
        template = template.replace("[father_name]", userData.father_name);
        template = template.replace("[mother_name]", userData.mother_name);


        return $sce.trustAsHtml(template);
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.lists = false;
        $scope.views.usersStats = false;
        $scope.views.stdAttendance = false;
        $scope.views.stdAttendanceReport = false;
        $scope.views.stfAttendance = false;
        $scope.views.stfAttendanceReport = false;
        $scope.views.stVacation = false;
        $scope.views.teacherVacation = false;
        $scope.views.vacationList = false;
        $scope.views.paymentsReports = false;
        $scope.views.paymentsResult = false;
        $scope.views.marksheetGeneration = false;
        $scope.views.expensesReports = false;
        $scope.views.expensesReportsResults = false;
        $scope.views.incomeReports = false;
        $scope.views.incomeReportsResults = false;
        $scope.views.biometric_users_table = false;
        $scope.views.payRollReports = false;
        $scope.views.payRollReportsResults = false;
        $scope.views.gen_cert = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('gradeLevelsController', function(dataFactory,$rootScope,$scope) {
    $scope.gradeLevels = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('gradeLevels/listAll').then(function(data) {
        $scope.gradeLevels = data;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('gradeLevels','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.gradeLevels.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('gradeLevels/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('gradeLevels/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.gradeLevels = apiModifyTable($scope.gradeLevels,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('gradeLevels/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.gradeLevels.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('examsListController', function(dataFactory,$rootScope,$scope,$sce) {
    $scope.examsList = {};
    $scope.classes = {};
    $scope.subjects = {};
    $scope.userRole ;
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.examSchedule = {};

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    dataFactory.httpRequest('examsList/listAll').then(function(data) {
        $scope.examsList = data.exams;
        $scope.classes = data.classes;
        $scope.subjectsList = data.subjects;
        $scope.userRole = data.userRole;
        showHideLoad(true);
    });

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subjects = data.subjects;
            $scope.sections = data.sections;
        });
    }

    $scope.notify = function(id){
        var confirmNotify = confirm($rootScope.phrase.sureMarks);
        if (confirmNotify == true) {
            showHideLoad();
            dataFactory.httpRequest('examsList/notify/'+id,'POST',{},$scope.form).then(function(data) {
                apiResponse(data,'add');
                showHideLoad(true);
            });
        }
    }

    $scope.addMSCol = function(){
        var colTitle = prompt("Please enter column title");
        if (colTitle != null) {
            if(typeof $scope.form.examMarksheetColumns == "undefined"){
                $scope.form.examMarksheetColumns = [];
            }

            $i = 1;
            angular.forEach($scope.form.examMarksheetColumns, function(value, key) {
                if($i <= parseInt(value.id)){
                    $i = parseInt(value.id) + 1;
                }
            });

            $scope.form.examMarksheetColumns.push({'id':$i,'title':colTitle});
        }
    }

    $scope.removeMSCol = function(col,$index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            $scope.form.examMarksheetColumns.splice($index,1);
        }
    }

    $scope.addScheduleRow = function(){
        if(typeof $scope.form.examSchedule == "undefined"){
            $scope.form.examSchedule = [];
        }
        $scope.form.examSchedule.push( {'subject':'','stDate':''} );
    }

    $scope.removeRow = function(row,index){
        $scope.form.examSchedule.splice(index,1);
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('examsList','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.examsList.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('examsList/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('examsList/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.examsList = apiModifyTable($scope.examsList,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('examsList/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.examsList.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.marks = function(exam){
        $scope.form.exam = exam.id;
        $scope.markClasses = [];

        try{
            exam.examClasses = JSON.parse(exam.examClasses);
        }catch(e){ }

        angular.forEach($scope.classes, function(value, key) {
            angular.forEach(exam.examClasses, function(value_) {
                if(parseInt(value.id) == parseInt(value_)){
                    $scope.markClasses.push(value);
                }
            });
        });
        $scope.changeView('premarks');
    }

    $scope.startAddMarks = function(){
        showHideLoad();
        dataFactory.httpRequest('examsList/getMarks','POST',{},$scope.form).then(function(data) {
            $scope.form.respExam = data.exam;
            $scope.form.respClass = data.class;
            $scope.form.respSubject = data.subject;
            $scope.form.respStudents = data.students;

            $scope.changeView('marks');
            showHideLoad(true);
        });
    }

    $scope.saveNewMarks = function(){
        showHideLoad();
        dataFactory.httpRequest('examsList/saveMarks/'+$scope.form.exam+"/"+$scope.form.classId+"/"+$scope.form.subjectId,'POST',{},$scope.form).then(function(data) {
            apiResponse(data,'add');
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.examDetails = function(id){
        showHideLoad();
        dataFactory.httpRequest('examsList/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('examDetails');
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.premarks = false;
        $scope.views.marks = false;
        $scope.views.examDetails = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('eventsController', function(dataFactory,$routeParams,$rootScope,$sce,$scope) {
    $scope.events = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;

    if($routeParams.eventId){
        showHideLoad();
        dataFactory.httpRequest('events/'+$routeParams.eventId).then(function(data) {
            $scope.form = data;
            $scope.eventDescription = $sce.trustAsHtml(data.eventDescription);
            $scope.changeView('read');
            showHideLoad(true);
        });
    }else{
        dataFactory.httpRequest('events/listAll').then(function(data) {
            angular.forEach(data.events, function (item) {
                item.eventDescription = $sce.trustAsHtml(item.eventDescription);
            });
            $scope.events = data.events;
            $scope.userRole = data.userRole;
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('events/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        showHideLoad();

        response = apiResponse(data,'edit');
        if(data.status == "success"){
            response.eventDescription = $sce.trustAsHtml(response.eventDescription);
            $scope.events = apiModifyTable($scope.events,response.id,response);
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('events/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.events.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(data){
        showHideLoad();
        
        response = apiResponse(data,'add');
        if(data.status == "success"){
            response.eventDescription = $sce.trustAsHtml(response.eventDescription);
            $scope.events.push(response);
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.fe_status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('events/fe_active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.events[$index].fe_active = response.fe_active;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.eventDescription = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('materialsController', function(dataFactory,$rootScope,$scope,$http,$sce) {
    $scope.classes = {};
    $scope.subject = {};
    $scope.materials = {};
    $scope.usertype= {};
    $scope.studentid={};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;
   

    dataFactory.httpRequest('materials/listAll').then(function(data) {
        $scope.classes = data.classes;
        $scope.materials = data.materials;
        $scope.userRole = data.userRole;
        showHideLoad(true);
    });

    $scope.numberSelected = function(item){
        var count = $(item + " :selected").length;
        if(count == 0){
            return true;
        }
    }



    $scope.sectionsList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.class_id}).then(function(data) {
            $scope.subject = data.subjects;
            $scope.sections = data.sections;
            $scope.form.subject = data.subjects;
            $scope.form.sections = data.sections;
        });
    }

    $scope.certGetStdList = function()
    {
        showHideLoad();
        dataFactory.httpRequest('reports/certGetStdList','POST',{},{"classId":$scope.form.class_id,"sectionId":$scope.form.sectionId}).then(function(data) 
        {
            if(data)
            {
                $scope.certUsersList = data;
            }
            if($scope.certUsersList.length == 0)
            {
                alert($rootScope.phrase.noMatches);
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('materials/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.isSectionSelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.saveEdit = function(data){
        response = apiResponse(data,'edit');
        if(data.status == "success"){
            showHideLoad();
            $scope.materials = apiModifyTable($scope.materials,response.id,response);
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#material_edit_file').val('');
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('materials/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.materials.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(data)
    {
        response = apiResponse(data,'add');
        if(data.status == "success")
        {
            showHideLoad();
            $scope.materials.push(response);
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#material_add_file').val('');
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('homeworkController', function(dataFactory,$rootScope,$scope,$sce) {
    $scope.classes = {};
    $scope.subject = {};
    $scope.section = {};
    $scope.homeworks = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;
    $scope.page = 1;
    $scope.totalItems = 0;

    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.homeworksTemp)){

            showHideLoad();
            dataFactory.httpRequest('homeworks/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.classes = data.classes;
                $scope.subject = data.subject;
                $scope.homeworks = data.homeworks;
                $scope.userRole = data.userRole;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('homeworks/listAll/'+pageNumber).then(function(data) {
                $scope.classes = data.classes;
                $scope.subject = data.subject;
                $scope.homeworks = data.homeworks;
                $scope.userRole = data.userRole;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.homeworksTemp)){
                $scope.homeworksTemp = $scope.homeworks;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.homeworks = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.homeworksTemp)){
                $scope.homeworks = $scope.homeworksTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.homeworksTemp = {};
            }
        }
    }

    $scope.load_data(1);


    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subject = data.subjects;
            $scope.sections = data.sections;
            $scope.form.subject = data.subjects;
            $scope.form.sections = data.sections;
        });
    }

    $scope.isSectionSelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.saveAnswer = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            $scope.changeView('list');
            showHideLoad(true);
        }
    }

    $scope.numberSelected = function(item){
        var count = $(item + " :selected").length;
        if(count == 0){
            return true;
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('homeworks/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();

            $scope.load_data();
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#homeworkFile').val('');
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('homeworks/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.homeworks.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();

            $scope.load_data();
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#homeworkFile').val('');
    }

    $scope.viewhomework = function(id){

        showHideLoad();
        dataFactory.httpRequest('homeworks_view/'+id).then(function(data) {
            $scope.viewhomeworkmodal = !$scope.viewhomeworkmodal;
            $scope.modalTitle = data.homeworkTitle;
            $scope.modalClass = "modal-lg";
            $scope.homeworkmodal_data = data;
            $scope.homeworkmodal_data.homeworkDescription = $sce.trustAsHtml($scope.homeworkmodal_data.homeworkDescription);
            showHideLoad(true);
        });
        
    }

    $scope.homework_apply =function(id,student,status){
        $scope.apply_form = {};
        $scope.apply_form.student = student;
        $scope.apply_form.status = status;

        showHideLoad();
        dataFactory.httpRequest('homeworks/apply/'+id,'POST',{},$scope.apply_form).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.homeworkmodal_data = response;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.homeworkDescription = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.upload = false;
        $scope.views.answers = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('assignmentsController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.subject = {};
    $scope.section = {};
    $scope.assignments = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole ;

    dataFactory.httpRequest('assignments/listAll').then(function(data) {
        $scope.classes = data.classes;
        $scope.subject = data.subject;
        $scope.assignments = data.assignments;
        if(typeof data.assignmentsAnswers != "undefined"){
            $scope.assignmentsAnswers = data.assignmentsAnswers;
        }
        $scope.userRole = data.userRole
        showHideLoad(true);
    });

    $scope.listAnswers = function(id){
        showHideLoad();
        dataFactory.httpRequest('assignments/listAnswers/'+id).then(function(data) {
            $scope.answers = data;
            $scope.changeView('answers');
            showHideLoad(true);
        });
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.subject = data.subjects;
            $scope.sections = data.sections;
            $scope.form.subject = data.subjects;
            $scope.form.sections = data.sections;
        });
    }

    $scope.upload = function(id){
        showHideLoad();
        dataFactory.httpRequest('assignments/checkUpload','POST',{},{'assignmentId':id}).then(function(data) {
            response = apiResponse(data,'add');
            if(data.canApply && data.canApply == "true"){
                $scope.form.assignmentId = id;
                $scope.changeView('upload');
            }
        });
        showHideLoad(true);
    }

    $scope.isSectionSelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.saveAnswer = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            $scope.changeView('list');
            showHideLoad(true);
        }
    }

    $scope.numberSelected = function(item){
        var count = $(item + " :selected").length;
        if(count == 0){
            return true;
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('assignments/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();

            $scope.assignments = apiModifyTable($scope.assignments,response.id,response);
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#AssignEditFile').val('');
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('assignments/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.assignments.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();

            $scope.assignments.push(response);
            $scope.changeView('list');
            showHideLoad(true);
        }
        $('#AssignAddFile').val('');
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.upload = false;
        $scope.views.answers = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('mailsmsController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.views = {};
    $scope.messages = {};
    $scope.views.send = true;
    $scope.form = {};
    $scope.form.selectedUsers = [];
    $scope.formS = {};
    $scope.sendNewScope = "form";


    $scope.getSents = function(page){
        showHideLoad();
        if(typeof page == undefined){
            var request = 'mailsms/listAll';
        }else{
            var request = 'mailsms/listAll/'+page;
        }
        dataFactory.httpRequest(request).then(function(data) {
            $scope.messages = data.items;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    dataFactory.httpRequest('classes/listAll').then(function(data) {
        $scope.classes = data.classes;
        showHideLoad(true);
    });
    $scope.getSents(1);

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('mailsms/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.messages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('mailsms','POST',{},$scope.form).then(function(data) {
            $.toast({
                heading: $rootScope.phrase.mailsms,
                text: $rootScope.phrase.mailSentSuccessfully,
                position: 'top-right',
                loaderBg:'#ff6849',
                icon: 'success',
                hideAfter: 3000,
                stack: 6
            });
            $scope.messages = data.items;
            $scope.totalItems = data.totalItems;
            $scope.sendNewScope = "success";
            showHideLoad(true);
        });
    }

    $scope.linkUsers = function(usersType){
        $scope.modalTitle = $rootScope.phrase.specificUsers;
        $scope.showModalLink = !$scope.showModalLink;
        $scope.usersType = usersType;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.sureRemove);
            return;
        }
        dataFactory.httpRequest('register/searchUsers/'+$scope.usersType+'/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(userS){
        if(typeof($scope.form.selectedUsers) == "undefined"){
            $scope.form.selectedUsers = [];
        }

        $scope.form.selectedUsers.push({"student":userS.name,"role":userS.role,"id": "" + userS.id + "" });
    }

    $scope.removeUser = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.selectedUsers) {
                if($scope.form.selectedUsers[x].id == index){
                    $scope.form.selectedUsers.splice(x,1);
                    break;
                }
            }
        }
    }

    $scope.loadTemplate = function(){
        showHideLoad();
        dataFactory.httpRequest('mailsms/templates').then(function(data) {
            $scope.templateList = data;
            $scope.modalTitle = $rootScope.phrase.loadFromTemplate;
            $scope.showModalLoad = !$scope.showModalLoad;
            showHideLoad(true);
        });
    }

    $scope.loadTemplateContent = function(){
        if($('#selectedTemplate').val() != ""){
            $scope.form.messageContentMail = $scope.templateList[$('#selectedTemplate').val()].templateMail;
            $scope.form.messageContentSms = $scope.templateList[$('#selectedTemplate').val()].templateSMS;
            $scope.showModalLoad = !$scope.showModalLoad;
        }
    }

    $scope.changeView = function(view){
        if(view == "send"){
            $scope.form = {};
            $scope.form.userType = 'teachers';
            $scope.form.sendForm = 'email';
        }
        $scope.views.send = false;
        $scope.views.list = false;
        $scope.views.settings = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('messagesController', function(dataFactory,$rootScope,$route,$scope,$location,$routeParams) {
    $scope.messages = {};
    $scope.message = {};
    $scope.messageDet = {};
    $scope.totalItems = 0;
    $scope.views = {};
    $scope.views.list = true;
    $scope.selectedAll = false;
    $scope.searchUsers = false;
    $scope.repeatCheck = true;
    $scope.form = {};
    $scope.messageBefore;
    $scope.messageAfter;
    $scope.searchResults = {};
    var routeData = $route.current;
    var currentMessageRefreshId;
    var messageId;

    $scope.totalItems = 0;
    $scope.pageChanged = function(newPage) {
        getResultsPage(newPage);
    };

    $scope.showMessage = function(id){
        $scope.repeatCheck = true;
        showHideLoad();
        dataFactory.httpRequest('messages/'+id).then(function(data) {
            data = successOrError(data);
            if(data){
                messageId = id;
                $scope.changeView('read');
                $scope.message = data.messages.reverse();
                $scope.messageDet = data.messageDet;
                if($scope.message[0]){
                    $scope.messageBefore = $scope.message[0].dateSent;
                }
                if($scope.message[$scope.message.length - 1]){
                    $scope.messageAfter = $scope.message[$scope.message.length - 1].dateSent;
                }
                currentMessageRefreshId = setInterval(currentMessagePull, 2000);
                $("#chat-box").slimScroll({ scrollTo: $("#chat-box").prop('scrollHeight')+'px' });
            }
            showHideLoad(true);
        });
    }

    getResultsPage(1);
    if($routeParams.messageId){
        $scope.showMessage($routeParams.messageId);
    }

    function getResultsPage(pageNumber) {
        dataFactory.httpRequest('messages/listAll/'+pageNumber).then(function(data) {
            $scope.messages = data.messages;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.linkUser = function(){
        $scope.modalTitle = $rootScope.phrase.searchUsers;
        $scope.searchUsers = !$scope.searchUsers;
    }

    $scope.searchUserButton = function(){
        var searchAbout = $('#searchKeyword').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('messages/searchUser/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        if(typeof $scope.form.toId == "undefined"){
            $scope.form.toId = [];
        }
        $scope.form.toId.push(student);
        $scope.searchUsers = !$scope.searchUsers;
    }


    $scope.checkAll = function(){
        $scope.selectedAll = !$scope.selectedAll;
        angular.forEach($scope.messages, function (item) {
            item.selected = $scope.selectedAll;
        });
    }

    $scope.loadOld = function(){
        dataFactory.httpRequest('messages/before/'+$scope.messageDet.fromId+'/'+$scope.messageDet.toId+'/'+$scope.messageBefore).then(function(data) {
            angular.forEach(data, function (item) {
                $scope.message.splice(0, 0,item);
            });
            if(data.length == 0){
                $('#loadOld').hide();
            }
            $scope.messageBefore = $scope.message[0].dateSent;
        });
    }

    $scope.markRead = function(){
        $scope.form.items = [];
        angular.forEach($scope.messages, function (item, key) {
            if($scope.messages[key].selected){
                $scope.form.items.push(item.id);
                $scope.messages[key].messageStatus = 0;
            }
        });
        dataFactory.httpRequest('messages/read',"POST",{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
        });
    }

    $scope.markUnRead = function(){
        $scope.form.items = [];
        angular.forEach($scope.messages, function (item, key) {
            if($scope.messages[key].selected){
                $scope.form.items.push(item.id);
                $scope.messages[key].messageStatus = 1;
            }
        });
        dataFactory.httpRequest('messages/unread',"POST",{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
        });
    }

    $scope.markDelete = function(){
        $scope.form.items = [];
        var len = $scope.messages.length
        while (len--) {
            if($scope.messages[len].selected){
                $scope.form.items.push($scope.messages[len].id);
                $scope.messages.splice(len,1);
            }
        }
        dataFactory.httpRequest('messages/delete',"POST",{},$scope.form).then(function(data) {
            response = apiResponse(data,'remove');
        });
    }

    var currentMessagePull = function(){
        if('#/messages/'+messageId == location.hash){
            dataFactory.httpRequest('messages/ajax/'+$scope.messageDet.fromId+'/'+$scope.messageDet.toId+'/'+$scope.messageAfter).then(function(data) {
                angular.forEach(data, function (item) {
                    $scope.message.push(item);
                    var newH = parseInt($("#chat-box").prop('scrollHeight')) + 100;
                    $("#chat-box").slimScroll({ scrollTo: newH+'px' });
                });
                if($scope.message[$scope.message.length - 1]){
                    $scope.messageAfter = $scope.message[$scope.message.length - 1].dateSent;
                }
            });
        }else{
            clearInterval(currentMessageRefreshId);
        }
    };

    $scope.replyMessage = function(){
        if($scope.form.reply != "" && typeof $scope.form.reply != "undefined"){
            $scope.form.disable = true;
            $scope.form.toId = $scope.messageDet.toId;
            dataFactory.httpRequest('messages/'+$scope.messageDet.id,'POST',{},$scope.form).then(function(data) {
                $("#chat-box").slimScroll({ scrollTo: $("#chat-box").prop('scrollHeight')+'px' });
                $scope.form = {};
            });
        }
    }

    $scope.sendMessageNow = function(){
        dataFactory.httpRequest('messages','POST',{},$scope.form).then(function(data) {
            if(data.messageId == "home"){
                getResultsPage(1);
                $scope.changeView('list');
            }else{
                $location.path('/messages/'+data.messageId);                
            }
        });
    }

    $scope.changeView = function(view){
        if(view == "read" || view == "list" || view == "create"){
            $scope.form = {};
        }
        if(view == "list" || view == "create"){
            clearInterval(currentMessageRefreshId);
        }
        $scope.views.list = false;
        $scope.views.read = false;
        $scope.views.create = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('onlineExamsController', function(dataFactory,$rootScope,$scope,$sce) {
    $scope.classes = {};
    $scope.subject = {};
    $scope.onlineexams = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.marksExam ;
    $scope.marks = {};
    $scope.takeData = {};
    $scope.form.examQuestion = [];
    $scope.subject_list;
    $scope.userRole ;

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    dataFactory.httpRequest('onlineExams/listAll').then(function(data) {
        $scope.classes = data.classes;
        $scope.subject = data.subjects;
        $scope.onlineexams = data.onlineExams;
        $scope.userRole = data.userRole;
        $scope.subject_list = data.subject_list;
        showHideLoad(true);
    });

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.examClass}).then(function(data) {
            $scope.subject = data.subjects;
            $scope.sections = data.sections;
        });
    }

    $scope.isSectionSelected = function(arrayData,valueData){
        if(arrayData.indexOf(valueData.toString()) > -1 || arrayData.indexOf(parseInt(valueData)) > -1){
            return true;
        }
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('onlineExams/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.onlineexams.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('onlineExams','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.onlineexams.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            $scope.subject = $scope.form.subject;
            $scope.sections = data.sections;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        console.log($scope.form);
        dataFactory.httpRequest('onlineExams/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.onlineexams = apiModifyTable($scope.onlineexams,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.addQuestion = function(){
        var hasTrueAnswer = false;
        if (typeof $scope.examTitle === "undefined" || $scope.examTitle == "") {
            alert("Question Title undefined");
            return ;
        }

        var questionData = {};
        questionData.title = $scope.examTitle;
        questionData.type = $scope.examQType;

        if (typeof $scope.ans1 != "undefined" && $scope.ans1 != "") {
            questionData.ans1 = $scope.ans1;
            if(questionData.type == "text"){
                hasTrueAnswer = true;
            }
        }
        if (typeof $scope.ans2 != "undefined" && $scope.ans2 != "") {
            questionData.ans2 = $scope.ans2;
        }
        if (typeof $scope.ans3 != "undefined" && $scope.ans3 != "") {
            questionData.ans3 = $scope.ans3;
        }
        if (typeof $scope.ans4 != "undefined" && $scope.ans4 != "") {
            questionData.ans4 = $scope.ans4;
        }
        if (typeof $scope.Tans != "undefined" && $scope.Tans != "") {
            questionData.Tans = $scope.Tans;
            hasTrueAnswer = true;
        }
        if (typeof $scope.Tans1 != "undefined" && $scope.Tans1 != "") {
            questionData.Tans1 = $scope.Tans1;
            hasTrueAnswer = true;
        }
        if (typeof $scope.Tans2 != "undefined" && $scope.Tans2 != "") {
            questionData.Tans2 = $scope.Tans2;
            hasTrueAnswer = true;
        }
        if (typeof $scope.Tans3 != "undefined" && $scope.Tans3 != "") {
            questionData.Tans3 = $scope.Tans3;
            hasTrueAnswer = true;
        }
        if (typeof $scope.Tans4 != "undefined" && $scope.Tans4 != "") {
            questionData.Tans4 = $scope.Tans4;
            hasTrueAnswer = true;
        }
        if( hasTrueAnswer == false){
            alert("You must select the true answer");
            return;
        }

        if (typeof $scope.questionMark != "undefined" && $scope.questionMark != "") {
            questionData.questionMark = $scope.questionMark;
        }

        $scope.form.examQuestion.push(questionData);
        console.log($scope.form.examQuestion);

        $scope.examTitle = "";
        $scope.questionMark = "";
        $scope.ans1 = "";
        $scope.ans2 = "";
        $scope.ans3 = "";
        $scope.ans4 = "";
        $scope.Tans = "";
        $scope.Tans1 = "";
        $scope.Tans2 = "";
        $scope.Tans3 = "";
        $scope.Tans4 = "";
    }

    $scope.removeQuestion = function(index){
        $scope.form.examQuestion.splice(index,1);
    }

    $scope.take = function(id){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/take/'+id,'POST',{},{}).then(function(data) {
            response = apiResponse(data,'add');
            if(response){
                $scope.changeView('take');
                $scope.takeData = data;
                $scope.examQuestions = data.examQuestions;

                angular.forEach($scope.examQuestions, function(value, key) {
                    $scope.examQuestions[key]['question_text'] = $sce.trustAsHtml($scope.examQuestions[key]['question_text']);
                });

                document.getElementById('onlineExamTimer').start();
                if(data.timeLeft != 0){
                    $scope.$broadcast('timer-set-countdown', data.timeLeft);
                }
            }
        });
        showHideLoad(true);
    }

    $scope.finishExam = function(){
        $scope.submitExam();
        alert($rootScope.phrase.examTimedOut);
    }

    $scope.submitExam = function(){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/took/'+$scope.takeData.id,'POST',{},{'answers':$scope.examQuestions}).then(function(data) {
            if (typeof data.grade != "undefined") {
                alert($rootScope.phrase.examYourGrade+data.grade);
            }else{
                alert($rootScope.phrase.examSubmitionSaved);
            }
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.marksData = function(id){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/marks/'+id).then(function(data) {
            $scope.marks = data.grade;
            $scope.examDegreeSuccess = data.examDegreeSuccess;

            $scope.marksExam = id;
            $scope.changeView('marks');
            showHideLoad(true);
        });
    }

    $scope.isSuccess = function(pass,grade){
        if(typeof grade == null){
            return ;
        }
        if(parseInt(grade) >= parseInt(pass)){
            return 'success';
        }
        if(parseInt(grade) < parseInt(pass)){
            return 'failed';
        }
    }

    $scope.uploadQimage = function($index,question){
        $scope.modalTitle = "Upload Image for question";
        $scope.uploadQimageModal = !$scope.uploadQimageModal;
        $scope.uploadImageQ = {};
        $scope.uploadImageQ.id = $index;
        $scope.uploadImageQ.question = question;
    }

    $scope.saveUploadImage = function(content){
        $scope.uploadQimageModal = !$scope.uploadQimageModal;
        $scope.form.examQuestion[$scope.uploadImageQ.id].image = content;
    }

    $scope.showStdMarks = function(studentAnswers){
        $scope.modalTitle = "Student's answers";
        $scope.modalClass = "modal-lg";
        $scope.studentAnswers = studentAnswers;
        $scope.showstdAnswerModal = !$scope.showstdAnswerModal;
    }

    $scope.questionsArch = function(){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/questions').then(function(data) {
            $scope.questionsList = data;
            $scope.changeView('questions');
            showHideLoad(true);
        });
    }

    $scope.addNewQuestion = function(){
        $scope.form = {};
        $scope.form.answersList = [""];
        $scope.changeView('addQuestion');
    }

    $scope.addAnswer = function(){
        $scope.form.answersList.push("");
    }

    $scope.delAnswer = function($index){
        $scope.form.answersList.splice($index,1);
    }

    $scope.saveQuestionAdd = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            $scope.questionsList.push(response);
            $scope.changeView('questions');
            showHideLoad(true);
        }
    }

    $scope.editQuestionF = function(id){
        showHideLoad();
        dataFactory.httpRequest('onlineExams/questions/'+id).then(function(data) {
            $scope.changeView('editQuestion');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveQuestionEdit = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            $scope.questionsList = apiModifyTable($scope.questionsList,response.id,response);
            $scope.changeView('questions');
            showHideLoad(true);
        }
    }

    $scope.removeQuestionArch = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('onlineExams/questions/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.questionsList.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.addQuestionToExam = function(){
        $scope.modalTitle = "Import Questions";
        $scope.formQ = {};
        $scope.formQ.answersList = [""];
        $scope.modalClass = "modal-lg";
        $scope.addQuestionModal = !$scope.addQuestionModal;
    }

    $scope.addAnswerOM = function(){
        $scope.formQ.answersList.push("");
    }

    $scope.delAnswerOM = function(index){
        $scope.formQ.answersList.splice(index,1);
    }

    $scope.removeQuestion = function(index){
        $scope.form.examQuestion.splice(index,1);
    }

    $scope.searchQuestion = function(){
        var searchAbout = $('#searchQuestion').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('onlineExams/searchQuestion/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.addQuestion2List = function(question){
        var discard_add = false;
        angular.forEach($scope.form.examQuestion, function(value, key) {
            if(value.id == question.id){
                discard_add = true;
            }
        });
        if(discard_add == false){
            $scope.form.examQuestion.push({"id":question.id,"question_text":question.question_text,"question_type":question.question_type});            
        }
    }

    $scope.saveQuestionModalAdd = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            $scope.form.examQuestion.push({"id":response.id,"question_text":response.question_text,"question_type":response.question_type});
            $scope.addQuestionModal = !$scope.addQuestionModal;
        }
    }

    $scope.closeAnswerOM = function(){
        $scope.addQuestionModal = !$scope.addQuestionModal;
    }

    $scope.removeExamQuestion = function(question,index){
        $scope.form.examQuestion.splice(index,1);
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.examQuestion = [];
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.take = false;
        $scope.views.marks = false;
        $scope.views.questions = false;
        $scope.views.addQuestion = false;
        $scope.views.editQuestion = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('TransportsController', function(dataFactory,$scope,$rootScope) {
    $scope.transports = {};
    $scope.transportsList = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.userRole = $rootScope.dashboardData.role;

    $scope.load_data = function(){
        dataFactory.httpRequest('transports/listAll').then(function(data) {
            $scope.transports = data.routes;
            $scope.vehicles = data.vehicles;
            showHideLoad(true);
        });       
    }
    $scope.load_data();

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('transports/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('transports/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('transports/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.transports.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('transports','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.list = function(id){
        showHideLoad();
        dataFactory.httpRequest('transports/list/'+id).then(function(data) {
            $scope.changeView('listSubs');
            $scope.transportsList = data;
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.listSubs = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('transport_vehicles', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.transport_vehicles = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('transport_vehicles/listAll').then(function(data) {
            $scope.transport_vehicles = data.transport_vehicles;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('transport_vehicles','POST',{},$scope.form,"driver_photo,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('transport_vehicles/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.transport_vehicles.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('transport_vehicles/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('transport_vehicles/'+$scope.form.id,'POST',{},$scope.form,"driver_photo,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('transport_vehicles/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('transport_members', function(dataFactory,$scope,$rootScope) {
    $scope.transports = {};
    $scope.transportsList = {};
    $scope.views = {};
    $scope.views.members = true;
    $scope.form = {};
    $scope.userRole = $rootScope.dashboardData.role;

    $scope.load_data = function(){
        dataFactory.httpRequest('transports/members').then(function(data) {
            $scope.transports = data.transports;
            showHideLoad(true);
        });       
    }
    $scope.load_data();

    $scope.search_users = function(){
        showHideLoad();
        dataFactory.httpRequest('transports/members','POST',{},$scope.form).then(function(data) {
            $scope.transport_members = data
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.listSubs = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('mediaController', function($rootScope,dataFactory,$scope,Upload,$timeout) {
    $scope.albums = {};
    $scope.media = {};
    $scope.dirParent = -1;
    $scope.dirNow = 0;
    $scope.current = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.userRole = $rootScope.dashboardData.role;
    $scope.mu_files_list = {};
    $scope.form = {};

    $scope.changeView = function(view){
        if(view == "addMedia" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.mu_files_list = {};
        }
        $scope.views.list = false;
        $scope.views.addAlbum = false;
        $scope.views.editAlbum = false;
        $scope.views.addMedia = false;
        $scope.views.editMedia = false;
        $scope.views[view] = true;
    }

    $scope.loadAlbum = function(id){
        showHideLoad();
        if(typeof id == "undefined" || id == 0){
            var reqUrl = 'media/listAll';
        }else{
            var reqUrl = 'media/listAll/'+id;
        }
        dataFactory.httpRequest(reqUrl).then(function(data) {
            $scope.albums = data.albums;
            $scope.media = data.media;
            if(data.current){
                $scope.current = data.current;
                $scope.dirParent = data.current.albumParent;
                $scope.dirNow = id;
            }else{
                $scope.current = {};
                $scope.dirParent = -1;
                $scope.dirNow = 0;
            }
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.loadAlbum();

    $scope.saveAlbum = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();

            $scope.albums.push(response);
            $scope.loadAlbum($scope.dirNow);
        }
        showHideLoad(true);
    }

    $scope.removeAlbum = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.removeAlbum);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('media/album/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.albums.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.editAlbumData = function(id){
        showHideLoad();
        dataFactory.httpRequest('media/editAlbum/'+id).then(function(data) {
            $scope.changeView('editAlbum');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEditAlbum = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();

            $scope.albums = apiModifyTable($scope.albums,response.id,response);
            $scope.loadAlbum($scope.dirNow);
        }
        showHideLoad(true);
    }

    $scope.saveMedia = function(content){
        response = apiResponse(content,'add');
        if(content.status == "success"){
            showHideLoad();

            $scope.media.push(response);
            $scope.loadAlbum($scope.dirNow);
        }
        showHideLoad(true);
    }

    $scope.upload_images = function(mu_files_list,errFiles){
        $scope.errFiles = errFiles;
        $scope.mm_files_count = 0;
        angular.forEach(mu_files_list, function(file) {
            if(typeof file.name == "undefined"){
                $scope.mm_files_count ++;
                if(mu_files_list.length == $scope.mm_files_count){
                    $scope.loadAlbum($scope.dirNow);
                    $scope.changeView('list');
                    showHideLoad(true);
                }
            }else{
                if(typeof file.uploaded == "undefined"){
                    showHideLoad();
                
                    file.upload = Upload.upload({
                        url: 'media',
                        data: {
                            mediaURL: file,
                            albumId: $scope.dirNow,
                            mediaTitle: $scope.form.mediaTitle,
                            mediaDescription: $scope.form.mediaDescription,
                            mediaType: $scope.form.mediaType
                        }
                    });

                    file.upload.then(function (response) {
                        $timeout(function () {
                            apiResponse(response,'edit');
                            $scope.mm_files_count ++;
                            file.result = response.data;
                            if(mu_files_list.length == $scope.mm_files_count){
                                $scope.loadAlbum($scope.dirNow);
                                $scope.changeView('list');
                                showHideLoad(true);
                            }
                        });
                    }, function (response) {
                        if (response.status > 0)
                            $scope.errorMsg = response.status + ': ' + response.data;
                    }, function (evt) {
                        file.progress = Math.min(100, parseInt(100.0 * evt.loaded / evt.total));
                    });
                }
            }
            
        });
    }

    $scope.addMediaServer = function(){
        $scope.form.albumId = $scope.dirNow;
        if($scope.form.mediaType == 0){
            $scope.upload_images($scope.mu_files_list);
        }else{
            showHideLoad();
            dataFactory.httpRequest('media','POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'edit');
                if(data.status == "success"){
                    $scope.loadAlbum($scope.dirNow);
                    $scope.changeView('list');
                }
                showHideLoad(true);
            });
        }

    }

    $scope.editItem = function(id){
        showHideLoad();
        dataFactory.httpRequest('media/'+id).then(function(data) {
            $scope.changeView('editMedia');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEditItem = function(content){
        response = apiResponse(content,'edit');
        if(content.status == "success"){
            showHideLoad();

            $scope.media = apiModifyTable($scope.media,response.id,response);
            $scope.loadAlbum($scope.dirNow);
        }
        showHideLoad(true);
    }

    $scope.removeItem = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('media/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.media.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

});

OraSchool.controller('staticController', function(dataFactory,$routeParams,$scope,$sce,$rootScope) {
    $scope.staticPages = {};
    $scope.views = {};
    $scope.form = {};
    $scope.userRole = $rootScope.dashboardData.role;
    $scope.pageId = $routeParams.pageId;

    if (typeof $scope.pageId != "undefined" && $scope.pageId != "") {
        showHideLoad();
        dataFactory.httpRequest('static/'+$scope.pageId).then(function(data) {
            $scope.changeView('show');
            $scope.form.pageTitle = data.pageTitle;
            $scope.pageContent = $sce.trustAsHtml(data.pageContent);
            showHideLoad(true);
        });
    }else{
        dataFactory.httpRequest('static/listAll').then(function(data) {
            $scope.staticPages = data;
            $scope.changeView('list');
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('static','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.staticPages.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
        $scope.form = {};
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('static/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('static/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.staticPages = apiModifyTable($scope.staticPages,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
        $scope.form = {};
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('static/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.staticPages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.pageActive = function(id){
        showHideLoad();
        dataFactory.httpRequest('static/active/'+id).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                angular.forEach($scope.staticPages, function (item) {
                    if(item.id == response.id){
                        if(item.pageActive == 1){
                            item.pageActive = 0;
                        }else{
                            item.pageActive = 1;
                        }
                    }
                });
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.pageContent = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.show = false;
        $scope.views.listSubs = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('attendanceStatsController', function(dataFactory,$scope,$sce) {
    $scope.attendanceStats = {};
    $scope.attendanceData = {};
    $scope.userRole;
    $scope.views = {};
    $scope.form = {};

    dataFactory.httpRequest('attendance/stats').then(function(data) {
        $scope.attendanceStats = data;
        if(data.role == "student"){
            $scope.changeView('lists');
        }else if(data.role == "parent"){
            $scope.changeView('listp');
        }
        $scope.userRole = data.attendanceModel;
        showHideLoad(true);
    });

    $scope.statsAttendance = function(){
        showHideLoad();
        dataFactory.httpRequest('attendance/stats','POST',{},$scope.form).then(function(data) {
            if(data){
                $scope.attendanceData = data;
                $scope.changeView('listdata');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.listdata = false;
        $scope.views.lists = false;
        $scope.views.listp = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('pollsController', function(dataFactory,$scope,$rootScope) {
    $scope.polls = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('polls/listAll').then(function(data) {
        $scope.polls = data;
        showHideLoad(true);
    });

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('polls/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.polls.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.addPollOption = function(item){
        var optionTitle = prompt($rootScope.phrase.voteOptionTitle);
        if (optionTitle != null) {
            if (typeof $scope.form.pollOptions === "undefined" || $scope.form.pollOptions == "") {
                $scope.form.pollOptions = [];
            }
            var newOption = {'title':optionTitle};
            $scope.form.pollOptions.push(newOption);
        }
    }

    $scope.removePollOption = function(item,index){
        $scope.form.pollOptions.splice(index,1);
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('polls/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('polls/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.polls = apiModifyTable($scope.polls,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('polls','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.polls.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.makeActive = function(id){
        showHideLoad();
        dataFactory.httpRequest('polls/active/'+id,'POST',{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                angular.forEach($scope.polls, function (item) {
                    item.pollStatus = 0;
                    if(item.id == response.id){
                        item.pollStatus = 1;
                    }
                });
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('mailsmsTemplatesController', function(dataFactory,$scope,$rootScope) {
    $scope.templates = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('MailSMSTemplates/listAll').then(function(data) {
        $scope.templates = data;
        showHideLoad(true);
    });

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('MailSMSTemplates/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('MailSMSTemplates/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('MailSMSTemplates','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.templates.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('MailSMSTemplates/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.templates.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.form.templateMail = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('dormitoriesController', function(dataFactory,$rootScope,$scope) {
    $scope.dormitories = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('dormitories/listAll').then(function(data) {
        $scope.dormitories = data;
        showHideLoad(true);
    });

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('dormitories/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('dormitories/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.dormitories = apiModifyTable($scope.dormitories,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('dormitories/delete/'+item.id,'POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.dormitories.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('dormitories','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.dormitories.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('invoicesController', function(dataFactory,$scope,$sce,$rootScope,$route) {
    $scope.invoices = {};
    $scope.students = {};
    $scope.classes = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.invoice = {};
    $scope.payDetails = {};
    $scope.searchInput = {};
    $scope.userRole = $rootScope.dashboardData.role;
    $scope.cur_page = 1;
    var methodName = $route.current.methodName;

    $scope.listInvoices = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('invoices/listAll/'+pageNumber).then(function(data) {
            $scope.invoices = data.invoices;
            $scope.students = data.students;
            $scope.classes = data.classes;
            $scope.totalItems = data.totalItems;
            $scope.currency_symbol = data.currency_symbol;
            showHideLoad(true);
        });
    }

    $scope.searchDB = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('invoices/listAll/'+pageNumber,'POST',{},{'searchInput':$scope.searchInput}).then(function(data) {
            $scope.invoices = data.invoices;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    if(methodName == "dueinvoices"){
        $scope.searchInput.dueInv = true;
    }

    $scope.getResultsPage = function(id){
        if(typeof id == "undefined"){
            id = $scope.cur_page;
        }
        $scope.cur_page = id;
        if(methodName == "dueinvoices"){
            $scope.searchDB(id);
        }else if ( !jQuery.isEmptyObject($scope.searchInput) ) {
            $scope.searchDB(id);
        }else{
            $scope.listInvoices(id);
        }
    }

    $scope.getResultsPage(1);

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.toggleSearch = function(){
        $('.advSearch').toggleClass('col-0 col-3 hidden',1000);
        $('.listContent').toggleClass('col-12 col-9',1000);
    }

    $scope.resetSearch = function(){
        $scope.searchInput = {};
        $scope.getResultsPage(1);
    }

    $scope.linkStudent = function(){
        $scope.modalTitle = $rootScope.phrase.selectStudents;
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('invoices/searchUsers/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        if(!$scope.form.paymentStudent){
            $scope.form.paymentStudent = [];
        }
        console.log($scope.form.paymentStudent);
        $scope.form.paymentStudent.push({'id':student.id,'name':student.name});
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.removeStudent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            $scope.form.paymentStudent.splice(index,1);
        }
    }

    $scope.totalItems = 0;
    $scope.pageChanged = function(newPage) {
        $scope.getResultsPage(newPage);
    };

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('invoices/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.invoices.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('invoices','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.getResultsPage(1);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('invoices/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.getResultsPage();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.seeInvoice = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/invoice/'+id).then(function(data) {
            $scope.invoice = data;
            $scope.changeView('invoice');
            showHideLoad(true);
        });
    }

    $scope.alertPaidData = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/details/'+id).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.payDetails = response.data;
                $scope.changeView('details');
            }
            showHideLoad(true);
        });
    }

    $scope.addPaymentRow = function(){
        if(typeof($scope.form.paymentRows) == "undefined"){
            $scope.form.paymentRows = [];
        }
        $scope.form.paymentRows.push({'title':'','amount':''});
    }

    $scope.recalcTotalAmount = function(){
        $scope.form.paymentAmount = 0;
        angular.forEach($scope.form.paymentRows, function(value, key) {
            $scope.form.paymentAmount = parseInt($scope.form.paymentAmount) + parseInt(value.amount);
        });
    }

    $scope.removeRow = function(row,index){
        $scope.form.paymentRows.splice(index,1);
        $scope.recalcTotalAmount();
    }

    $scope.collect = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/invoice/'+id).then(function(data) {
            $scope.invoice = data;
            $scope.modalTitle = "Collect Invoice";
            $scope.modalClass = "modal-lg";
            $scope.collectInvoice = !$scope.collectInvoice;
            showHideLoad(true);
        });
    }

    $scope.collectInvoiceNow = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/collect/'+id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.collectInvoice = !$scope.collectInvoice;
                if($scope.views.invoice){
                    $scope.seeInvoice(id);
                }else {
                    $scope.getResultsPage();
                }
            }
            showHideLoad(true);
        });
    }

    $scope.revert = function(collection){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('invoices/revert/'+collection,'POST',{},{}).then(function(data) {
                response = apiResponse(data,'edit');
                if(data.status == "success"){
                    $scope.seeInvoice($scope.invoice.payment.id);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.payOnline = function(id){
        showHideLoad();
        dataFactory.httpRequest('invoices/invoice/'+id).then(function(data) {
            $scope.invoice = data;
            $scope.modalTitle = "Pay Invoice Online";
            $scope.payOnlineModal = !$scope.payOnlineModal;
            showHideLoad(true);
        });
    }

    $scope.payOnlineNow = function(id){
        $scope.form.invoice = id;
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.invoice = false;
        $scope.views.details = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('languagesController', function(dataFactory,$rootScope,$scope) {
    $scope.languages = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    $scope.translate = function(){
        $(".phraseList label").each(function(i, current){
            var str = $(current).text();
            if($(current).children('input').val() == ""){
                var str2 = $(current).children('input').val(str);
                $(current).children('input').trigger('input');
            }

        });
        return;
    }

    $scope.highlight = function(){
        $(".phraseList label").each(function(i, current){
            if($(current).children('input').val() == ""){
                $(current).children('input').css('border','10px solid');
            }

        });
        return;
    }

    dataFactory.httpRequest('languages/listAll').then(function(data) {
        $scope.languages = data;
        showHideLoad(true);
    });

    $scope.addLang = function(){
        $scope.form = {};
        $scope.form.languagePhrases = {};
        $scope.changeView('edit');
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('languages/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        if(typeof $scope.form.id == "undefined"){
            showHideLoad();
            dataFactory.httpRequest('languages','POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'add');
                if(data.status == "success"){
                    $scope.languages.push(response);
                    $scope.changeView('list');
                }
                showHideLoad(true);
            });
        }else{
            showHideLoad();
            dataFactory.httpRequest('languages/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'edit');
                if(data.status == "success"){
                    $scope.languages = apiModifyTable($scope.languages,response.id,response);
                    $scope.changeView('list');
                }
                showHideLoad(true);
            });
        }
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('languages/delete/'+item.id,'POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.languages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){

    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('promotionController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.students = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.sections ={};
    $scope.classesArray = [];
    $scope.form.studentInfo = [];

    showHideLoad(true);
    $scope.classesList = function(){
        dataFactory.httpRequest('dashboard/classesList','POST',{},{"academicYear":$scope.form.acYear}).then(function(data) {
            $scope.classes = data.classes;
            $scope.subjects = data.subjects;
        });
    }

    $scope.classesPromoteList = function(key){
        dataFactory.httpRequest('dashboard/classesList','POST',{},{"academicYear":$scope.studentsList.students[key].acYear}).then(function(data) {
            $scope.classesArray[key] = data;
            $scope.sections = data.sections;
        });
    }


    $scope.listStudents = function(){
        showHideLoad();
        dataFactory.httpRequest('promotion/listStudents','POST',{},$scope.form).then(function(data) {
            $scope.promoType = $scope.form.promoType;
            $scope.studentsList = data;
            $scope.sections = data.classes.sections;

            angular.forEach(data.students, function(value, key) {
                $scope.classesArray[key] = data.classes;
            });

            $scope.changeView('studentPromote');
            showHideLoad(true);
        });
    }

    $scope.removePromoStudent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (key in $scope.studentsList.students) {
                if($scope.studentsList.students[key].id == index){
                    delete $scope.studentsList.students[key];
                    break;
                }
            }
        }
    }

    $scope.promoteNow = function(){
        showHideLoad();
        if($scope.promoType == 'graduate'){
            angular.forEach($scope.studentsList.students, function(value, key) {
                $scope.studentsList.students[key]['acYear'] = 0;
            });
        }
        dataFactory.httpRequest('promotion','POST',{},{'promote':$scope.studentsList.students,'promoType':$scope.promoType}).then(function(data) {
            if(data){
                $scope.studentsPromoted = data;
                $scope.changeView('studentsPromoted');
            }
            showHideLoad(true);
        });
    }

    $scope.linkStudent = function(){
        $scope.modalTitle = $rootScope.phrase.promoteStudents;
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('promotion/search/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        $scope.form.studentInfo.push({"student":student.name,"id": "" + student.id + "" });
    }

    $scope.removeStudent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.studentInfo) {
                if($scope.form.studentInfo[x].id == index){
                    $scope.form.studentInfo.splice(x,1);
                    break;
                }
            }
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.studentsPromoted = false;
        $scope.views.studentPromote = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('academicYearController', function(dataFactory,$rootScope,$scope) {
    $scope.academicYears = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('academic/listAll').then(function(data) {
        $scope.academicYears = data;
        showHideLoad(true);
    });

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('academic/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.academicYears.splice(index,1);
                    $rootScope.dashboardData.academicYear = $scope.academicYears;
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('academic/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('academic/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(response){
                $scope.academicYears = apiModifyTable($scope.academicYears,response.id,response);
                $rootScope.dashboardData.academicYear = $scope.academicYears;
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('academic','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(response){
                if(response.isDefault == 1){
                    angular.forEach($scope.academicYears, function (item) {
                        item.isDefault = 0;
                    });
                }
                $scope.academicYears.push({"id":response.id,"yearTitle":response.yearTitle,"isDefault":response.isDefault});
                $rootScope.dashboardData.academicYear = $scope.academicYears;
                location.reload();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.makeActive = function(id){
        showHideLoad();
        dataFactory.httpRequest('academic/active/'+id,'POST',{}).then(function(data) {
            response = apiResponse(data,'edit');
            if(response){
                angular.forEach($scope.academicYears, function (item) {
                    item.isDefault = 0;
                    if(item.id == response.id){
                        item.isDefault = 1;
                    }
                });
                $rootScope.dashboardData.academicYear = $scope.academicYears;
                location.reload();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('vacationController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.views = {};
    $scope.form = {};
    $scope.vacation ;
    $scope.vacation_requests = {};
    $scope.my_requests = {};
    var methodName = $route.current.methodName;

    if(methodName == "approve"){
        $scope.views.list_approve = true;
        showHideLoad();
        dataFactory.httpRequest('vacation/approve').then(function(data) {
            $scope.vacation_requests = data;
            showHideLoad(true);
        });
    }else if(methodName == "mine"){
        $scope.views.list_mine = true;
        showHideLoad();
        dataFactory.httpRequest('vacation/mine').then(function(data) {
            $scope.my_requests = data;
            showHideLoad(true);
        });
    }else{
        $scope.views.list = true;
        showHideLoad(true);
    }

    $scope.approveVacation = function(userid,status,index){
        showHideLoad();
        dataFactory.httpRequest('vacation/approve','POST',{},{'id':userid,'status':status}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                console.log(index);
                $scope.vacation_requests.splice(index,1);
                console.log($scope.vacation_requests);
            }
            showHideLoad(true);
        });
    }

    $scope.getVacation = function(){
        showHideLoad();
        dataFactory.httpRequest('vacation','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.vacation = response;
                $scope.changeView('lists');
            }
            showHideLoad(true);
        });
    }

    $scope.confirmVacation = function(){
        showHideLoad();
        dataFactory.httpRequest('vacation/confirm','POST',{},{'days':$scope.vacation}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.lists = false;
        $scope.views.list_approve = false;
        $scope.views.list_mine = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('hostelController', function(dataFactory,$rootScope,$scope) {
    $scope.hostelList = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.hostelSubList = {};
    $scope.form = {};

    dataFactory.httpRequest('hostel/listAll').then(function(data) {
        $scope.hostelList = data;
        showHideLoad(true);
    });

    $scope.listSub = function(id){
        showHideLoad();
        dataFactory.httpRequest('hostel/listSubs/'+id).then(function(data) {
            $scope.changeView('listSubs');
            $scope.hostelSubList = data;
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('hostel','POST',{},$scope.form,"managerPhoto").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.hostelList.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('hostel/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('hostel/'+$scope.form.id,'POST',{},$scope.form,"managerPhoto").then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.hostelList = apiModifyTable($scope.hostelList,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('hostel/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.hostelList.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.listSubs = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('hostelCatController', function(dataFactory,$rootScope,$scope) {
    $scope.hostelList = {};
    $scope.hostelCat = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('hostelCat/listAll').then(function(data) {
        $scope.hostelList = data.hostel;
        $scope.hostelCat = data.cat;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('hostelCat','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.hostelCat.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('hostelCat/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('hostelCat/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.hostelCat = apiModifyTable($scope.hostelCat,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('hostelCat/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.hostelCat.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('expensesController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.expenses = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    $scope.listExpenses = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('expenses/listAll/'+pageNumber).then(function(data) {
            $scope.expenses = data.expenses;
            $scope.totalItems = data.totalItems;
            $scope.expenses_cat = data.expenses_cat;
            $scope.totalExpenses = data.totalExpenses;
            showHideLoad(true);
        });
    }

    $scope.listExpenses(1);

    $scope.getTotal = function(key){
        var total = 0;
        for(var i = 0; i < $scope.expenses[key].length; i++){
            total += parseInt($scope.expenses[key][i].expenseAmount);
        }
        return total;
    }

    $scope.saveAdd = function(data){
        showHideLoad();
        response = apiResponse(data,'add');
        if(data.status == "success"){
            $route.reload();
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('expenses/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        showHideLoad();
        response = apiResponse(data,'edit');
        if(data.status == "success"){
            $route.reload();
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('expenses/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $route.reload();
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('feeTypeController', function(dataFactory,$rootScope,$scope) {
    $scope.feeTypes = {};
    $scope.feeGroups = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('feeTypes/listAll').then(function(data) {
        $scope.feeTypes = data.types;
        $scope.feeGroups = data.groups;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('feeTypes','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.feeTypes.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('feeTypes/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('feeTypes/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.feeTypes = apiModifyTable($scope.feeTypes,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('feeTypes/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.feeTypes.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.chgFeeSchType = function(location){
        $scope.form.feeSchDetails = {};
        if(location == "first"){
            $scope.form.feeSchDetails.first = {};
        }
        if(location == "second"){
            $scope.form.feeSchDetails.first = {};
            $scope.form.feeSchDetails.second = {};
        }
        if(location == "third"){
            $scope.form.feeSchDetails.first = {};
            $scope.form.feeSchDetails.second = {};
            $scope.form.feeSchDetails.third = {};
        }
        if(location == "fourth"){
            $scope.form.feeSchDetails.first = {};
            $scope.form.feeSchDetails.second = {};
            $scope.form.feeSchDetails.third = {};
            $scope.form.feeSchDetails.fourth = {};
        }
        if(location == "twelvth"){
            $scope.form.feeSchDetails.first = {};
            $scope.form.feeSchDetails.second = {};
            $scope.form.feeSchDetails.third = {};
            $scope.form.feeSchDetails.fourth = {};
            $scope.form.feeSchDetails.fifth = {};
            $scope.form.feeSchDetails.sixth = {};
            $scope.form.feeSchDetails.seventh = {};
            $scope.form.feeSchDetails.eighth = {};
            $scope.form.feeSchDetails.ninth = {};
            $scope.form.feeSchDetails.tenth = {};
            $scope.form.feeSchDetails.eleventh = {};
            $scope.form.feeSchDetails.twelveth = {};
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('feeDiscountController', function(dataFactory,$rootScope,$scope) {
    $scope.feeDiscount = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('fee_discount/listAll').then(function(data) {
        $scope.feeDiscount = data;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('fee_discount','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.feeDiscount.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('fee_discount/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('fee_discount/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.feeDiscount = apiModifyTable($scope.feeDiscount,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('fee_discount/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.feeDiscount.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.ctrl_assignment = function(id){
        $scope.new_ass = {};
        showHideLoad();
        dataFactory.httpRequest('fee_discount/assignments/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.fee_discount = data.fee_discount;
            $scope.classes = data.classes;
            $scope.changeView('show');
            showHideLoad(true);
        });
    }

    $scope.addAssToDiscount = function(id){
        dataFactory.httpRequest('fee_discount/assignments/'+id,'POST',{},$scope.new_ass).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.fee_discount = response.fee_discount;
                $scope.new_ass = {};
            }
            showHideLoad(true);
        });
    }

    $scope.openSearch = function(part){
        $scope.modalTitle = "Search";
        $scope.searchModal = !$scope.searchModal;
        $scope.searchPart = part;
        $scope.searchAbout = "";
    }

    $scope.ctrl_search = function(part){
        if(part == "invoices"){
            var searchAbout = $("#searchInvText").val();
        }
        if(part == "students"){
            var searchAbout = $("#searchStdText").val();
        }
        showHideLoad();
        dataFactory.httpRequest('fee_discount/search/'+part,'POST',{},{'keyword':searchAbout}).then(function(data) {
            if(part == "invoices"){
                $scope.invoicesResults = data;
            }else if(part == "students"){
                $scope.studentsResults = data;
            }
            showHideLoad(true);
        });
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.new_ass.classId}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.linkInvoice = function(inv){
        if(typeof $scope.new_ass.invoices == "undefined"){
            $scope.new_ass.invoices = [];
        }
        $scope.new_ass.invoices.push(inv);
    }

    $scope.removeInvoice = function(index){
        $scope.new_ass.invoices.splice(index,1);
    }

    $scope.linkStudent = function(student){
        if(typeof $scope.new_ass.students == "undefined"){
            $scope.new_ass.students = [];
        }
        $scope.new_ass.students.push(student);
    }

    $scope.removeStudent = function(index){
        $scope.new_ass.students.splice(index,1);
    }

    $scope.remove_assignment_item = function(key,itemkey){
        showHideLoad();
        dataFactory.httpRequest('fee_discount/assignments_remove/'+$scope.fee_discount.id,'POST',{},{'key':key,'uniqid':itemkey}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                delete $scope.fee_discount.discount_assignment[key][itemkey];
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.show = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('feeGroupController', function(dataFactory,$rootScope,$scope) {
    $scope.feeGroups = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('feeGroups/listAll').then(function(data) {
        $scope.feeGroups = data;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('feeGroups','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.feeGroups.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('feeGroups/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('feeGroups/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.feeGroups = apiModifyTable($scope.feeGroups,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('feeGroups/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.feeGroups.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('expensesCatController', function(dataFactory,$rootScope,$scope) {
    $scope.expensesCats = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('expensesCat/listAll').then(function(data) {
        $scope.expensesCats = data;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('expensesCat','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.expensesCats.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('expensesCat/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('expensesCat/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.expensesCats = apiModifyTable($scope.expensesCats,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('expensesCat/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.expensesCats.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('incomesCatController', function(dataFactory,$rootScope,$scope) {
    $scope.incomeCats = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('incomesCat/listAll').then(function(data) {
        $scope.incomeCats = data;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('incomesCat','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.incomeCats.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('incomesCat/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('incomesCat/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.incomeCats = apiModifyTable($scope.incomeCats,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('incomesCat/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.incomeCats.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('incomesController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.incomes = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    $scope.listIncome = function(pageNumber){
        showHideLoad();
        dataFactory.httpRequest('incomes/listAll/'+pageNumber).then(function(data) {
            $scope.incomes = data.incomes;
            $scope.totalItems = data.totalItems;
            $scope.totalIncome = data.totalIncome;
            $scope.income_cat = data.income_cat;
            showHideLoad(true);
        });
    }

    $scope.listIncome(1);

    $scope.getTotal = function(key){
        var total = 0;
        for(var i = 0; i < $scope.incomes[key].length; i++){
            total += parseInt($scope.incomes[key][i].expenseAmount);
        }
        return total;
    }

    $scope.saveAdd = function(data){
        showHideLoad();
        response = apiResponse(data,'add');
        if(data.status == "success"){
            $route.reload();
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('incomes/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        showHideLoad();
        response = apiResponse(data,'edit');
        if(data.status == "success"){
            $route.reload();
            $scope.changeView('list');
        }
        showHideLoad(true);
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('incomes/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $route.reload();
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('feeAllocationController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.classes = {};
    $scope.feeTypes = {};
    $scope.classAllocation = {};
    $scope.studentAllocation = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('feeAllocation/listAll').then(function(data) {
        $scope.feeGroups = data.feeGroups;
        $scope.classes = data.classes;
        $scope.feeAllocation = data.feeAllocation;
        showHideLoad(true);
    });

    $scope.loadFeeTypes = function(){
        dataFactory.httpRequest('feeAllocation/listFeeTypes/'+$scope.form.feeGroup).then(function(data) {
            $scope.feeTypes = data;
        });
    }

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.feeSchDetailsClass}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.isSectionSelected = function(arrayData,valueData){
        return arrayData.indexOf(valueData) > -1;
    }

    $scope.showModal = false;
    $scope.studentProfile = function(id){
        dataFactory.httpRequest('students/profile/'+id).then(function(data) {
            $scope.modalTitle = data.title;
            $scope.modalContent = $sce.trustAsHtml(data.content);
            $scope.showModal = !$scope.showModal;
        });
    };

    $scope.linkStudent = function(){
        $scope.modalTitle = $rootScope.phrase.selectStudents;
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest('invoices/searchUsers/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(student){
        if(!$scope.form.feeSchDetailsStudents){
            $scope.form.feeSchDetailsStudents = [];
        }
        $scope.form.feeSchDetailsStudents.push({'id':student.id,'name':student.name});
        $scope.showModalLink = !$scope.showModalLink;
    }

    $scope.removeStudent = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.feeSchDetailsStudents) {
                if($scope.form.feeSchDetailsStudents[x].id == index){

                    $scope.form.feeSchDetailsStudents.splice(x,1);
                    $scope.form.studentInfoSer = JSON.stringify($scope.form.feeSchDetailsStudents);
                    break;
                }
            }
        }
    }

    $scope.addFeeAllocation = function(){
        $scope.changeView('add');
        $scope.form.allocationValues = $scope.feeTypes;
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('feeAllocation','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $route.reload();
            }
            showHideLoad(true);
        });
    }

    $scope.feeType = function(id){
        for (x in $scope.feeTypes) {
            if($scope.feeTypes[x].id == id){
                return $scope.feeTypes[x].feeTitle;
            }
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('feeAllocation/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data.allocation;
            $scope.feeTypes = data.feeTypes;
            $scope.sections = data.sections;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('feeAllocation/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $route.reload();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index,rtype){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('feeAllocation/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    if(rtype == "class"){
                        $scope.classAllocation.splice(index,1);
                    }else{
                        $scope.studentAllocation.splice(index,1);
                    }
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('sectionsController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.sections = {};
    $scope.classes = {};
    $scope.teachers = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('sections/listAll').then(function(data) {
        $scope.sections = data.sections;
        $scope.classes = data.classes;
        $scope.teachers = data.teachers;
        showHideLoad(true);
    });

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('sections','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $route.reload();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('sections/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('sections/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $route.reload();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('sections/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $route.reload();
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('mobileNotifController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.views = {};
    $scope.messages = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.selectedUsers = [];
    $scope.formS = {};
    $scope.sendNewScope = "form";

    $scope.loadNotifications = function(page){
        dataFactory.httpRequest('mobileNotif/listAll/' + page).then(function(data) {
            $scope.subject_list = data.subject_list;
            $scope.messages = data.items;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    dataFactory.httpRequest('mobileNotif/list_classes').then(function(data) {
        $scope.classes = data.classes;
    });

    $scope.loadNotifications(1);

    $scope.subjectList = function(){
        dataFactory.httpRequest('dashboard/sectionsSubjectsList','POST',{},{"classes":$scope.form.classId}).then(function(data) {
            $scope.sections = data.sections;
        });
    }

    $scope.sendNotif = function(){
        showHideLoad();
        dataFactory.httpRequest('classes/listAll').then(function(data) {
            $scope.classes = data.classes;
            $scope.changeView('send');
            showHideLoad(true);
        });
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('mobileNotif','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.subject_list = response.subject_list;
                $scope.messages = response.items;
                $scope.totalItems = response.totalItems;
                $scope.sendNewScope = "success";
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('mobileNotif/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.messages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.linkUsers = function(usersType){
        $scope.modalTitle = $rootScope.phrase.specificUsers;
        $scope.showModalLink = !$scope.showModalLink;
        $scope.usersType = usersType;
    }

    $scope.linkStudentButton = function(){
        var searchAbout = $('#searchLink').val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.sureRemove);
            return;
        }
        dataFactory.httpRequest('register/searchUsers/'+$scope.usersType+'/'+searchAbout).then(function(data) {
            $scope.searchResults = data;
        });
    }

    $scope.linkStudentFinish = function(userS){
        if(typeof($scope.form.selectedUsers) == "undefined"){
            $scope.form.selectedUsers = [];
        }

        $scope.form.selectedUsers.push({"student":userS.name,"role":userS.role,"id": "" + userS.id + "" });
    }

    $scope.removeUser = function(index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.selectedUsers) {
                if($scope.form.selectedUsers[x].id == index){
                    $scope.form.selectedUsers.splice(x,1);
                    break;
                }
            }
        }
    }

    $scope.changeView = function(view){
        if(view == "send"){
            $scope.form = {};
        }
        $scope.views.send = false;
        $scope.views.list = false;
        $scope.views.settings = false;
        $scope.views[view] = true;
    }

});


OraSchool.controller('dbexportsController', function(dataFactory,$rootScope,$scope) {
    $scope.classes = {};
    $scope.views = {};
    $scope.messages = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.form.selectedUsers = [];
    $scope.formS = {};
    $scope.sendNewScope = "form";

    showHideLoad(true);
    $scope.loadNotifications = function(page){
        dataFactory.httpRequest('mobileNotif/listAll/' + page).then(function(data) {
            $scope.subject_list = data.subject_list;
            $scope.messages = data.items;
            $scope.totalItems = data.totalItems;
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "send"){
            $scope.form = {};
        }
        $scope.views.send = false;
        $scope.views.list = false;
        $scope.views.settings = false;
        $scope.views[view] = true;
    }

});


OraSchool.controller('frontend_pagesController', function(dataFactory,$rootScope,$scope,$window) {
    $scope.pages = {};
    $scope.templates = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};
    $scope.frontend_baseurl = "";

    dataFactory.httpRequest('frontend/listAll').then(function(data) {
        $scope.pages = data.pages;
        $scope.templates =  data.templates;
        $scope.frontend_baseurl = data.frontend_baseurl;
        $scope.changeView('list');
        showHideLoad(true);
    });

    $scope.saveAdd = function(content){
        showHideLoad();
        dataFactory.httpRequest('frontend','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.pages.push(response);
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('frontend/delete/'+item.id,'POST',{},{}).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.pages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('frontend/'+id).then(function(data) {
            $scope.form = data;
            $scope.form.show_page_permalink = true;
            $scope.chg_permalink_status = 1;
            $scope.changeView('edit');
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(content){
        showHideLoad();
        dataFactory.httpRequest('frontend/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.pages = apiModifyTable($scope.pages,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.save_draft = function(){
        $scope.form.page_status = "draft";
        if($scope.views.add){
            $scope.saveAdd();
        }else{
            $scope.saveEdit();
        }
        $scope.changeView('list');
    }

    $scope.save_publish = function(){
        $scope.form.page_status = "publish";
        if($scope.views.add){
            $scope.saveAdd();
        }else{
            $scope.saveEdit();
        }
        $scope.changeView('list');
    }

    $scope.save_preview = function(){
        if($scope.views.add){
            $scope.saveAdd();
        }else{
            $scope.saveEdit();
        }
        setTimeout(function (){
            $window.open($scope.frontend_baseurl + $scope.form.page_permalink, '_blank');
        }, 500);
        
    }

    $scope.generate_permalink = function(){
        if($scope.form.page_title != "" && ($scope.form.page_permalink == "" || typeof $scope.form.page_permalink == "undefined") ){
            dataFactory.httpRequest('frontend/gen_permalink','POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'edit');
                if(data.status == "success"){
                    $scope.form.page_permalink = response.page_permalink;
                    $scope.form.show_page_permalink = true;
                }
            });
        }
    }

    $scope.show_permalink_form = function(){
        $scope.chg_permalink_status = 2;
        $scope.new_page_permalink = $scope.form.page_permalink;
    }

    $scope.check_permalink = function(){
        showHideLoad();
        dataFactory.httpRequest('frontend/check_permalink/'+$scope.form.id,'POST',{},{'new_permalink':$scope.new_page_permalink}).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.form.page_permalink = response.page_permalink;
                $scope.form.show_page_permalink = true;
                $scope.chg_permalink_status = 1;
            }
            showHideLoad(true);
        });
    }

    $scope.select_featured_image = function(){
        $rootScope.selected_images = [];
        $rootScope.gallery_return_scope = $scope.selected_featured_image;
        $rootScope.modalClass = "modal-lg";
        $rootScope.modalTitle = "Media Manager";
        $rootScope.allow_multiple = false;
        $rootScope.show_gallery = true;
        $rootScope.show_uploader = true;
        $rootScope.mm_open();
    }

    $scope.selected_featured_image = function(){
        if(typeof $scope.form == "undefined"){
            $scope.form = {};
        }
        $scope.form.page_feat_image = $rootScope.selected_images[0];
        console.log($rootScope.selected_images);
    }

    $scope.select_slider_image = function(){
        $rootScope.selected_images = [];
        $rootScope.gallery_return_scope = $scope.selected_slider_images;
        $rootScope.modalClass = "modal-lg";
        $rootScope.modalTitle = "Media Manager";
        $rootScope.allow_multiple = true;
        $rootScope.show_gallery = true;
        $rootScope.show_uploader = true;
        $rootScope.mm_open();
    }

    $scope.selected_slider_images = function(){
        if(typeof $scope.form == "undefined"){
            $scope.form = {};
        }
        $scope.form.page_slider_images = $rootScope.selected_images;
    }    

    $scope.changeView = function(view){
        if(view == "add" || view == "list"){
            $scope.form = {};
            $scope.form.page_content = "";
            $scope.chg_permalink_status = 1;
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('frontend_settingsController', function(dataFactory,$rootScope,$scope,$route) {
    $scope.views = {};
    $scope.form = {};
    $scope.newDayOff ;
    var methodName = $route.current.methodName;
    $scope.oldThemeVal;

    $scope.changeView = function(view){
        $scope.views.settings = false;
        $scope.views.terms = false;
        $scope.views[view] = true;
    }

    dataFactory.httpRequest('frontend/settings').then(function(data) {
        $scope.form = data;
        showHideLoad(true);
    });

    $scope.saveSettings = function(){
        showHideLoad();
        $scope.form.smsProvider = $scope.formS;
        $scope.form.mailProvider = $scope.formM;
        dataFactory.httpRequest('frontend/settings','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            location.reload();
            showHideLoad(true);
        });
    }

});


OraSchool.controller('payroll_salaryController', function(dataFactory,$rootScope,$scope) {
    $scope.salary_base = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('salary_base/listAll').then(function(data) {
        $scope.salary_base = data;
        showHideLoad(true);
    });

    $scope.addAllowencRow = function(){
        if(typeof($scope.form.salary_allowence) == "undefined"){
            $scope.form.salary_allowence = [];
        }
        $scope.form.salary_allowence.push({'title':'','amount':''});
    }

    $scope.removeAllowenceRow = function(row,index){
        $scope.form.salary_allowence.splice(index,1);
        $scope.recalcTotalAmount();
    }

    $scope.addDeductionRow = function(){
        if(typeof($scope.form.salary_deduction) == "undefined"){
            $scope.form.salary_deduction = [];
        }
        $scope.form.salary_deduction.push({'title':'','amount':''});
    }

    $scope.removeDeductionRow = function(row,index){
        $scope.form.salary_deduction.splice(index,1);
        $scope.recalcTotalAmount();
    }

    $scope.recalcTotalAmount = function(){
        $scope.form.gross_salary = parseInt($scope.form.salary_basic);
        angular.forEach($scope.form.salary_allowence, function(value, key) {
            $scope.form.gross_salary += parseInt(value.amount);
        });
        $scope.form.net_salary = parseInt($scope.form.gross_salary);
        angular.forEach($scope.form.salary_deduction, function(value, key) {
            $scope.form.net_salary -= parseInt(value.amount);
        });
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('salary_base/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('salary_base/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.salary_base = apiModifyTable($scope.salary_base,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('salary_base/delete/'+item.id,'POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.salary_base.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('salary_base','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.salary_base.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});


OraSchool.controller('payroll_hourlyController', function(dataFactory,$rootScope,$scope) {
    $scope.hourly_base = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.form = {};

    dataFactory.httpRequest('hourly_base/listAll').then(function(data) {
        $scope.hourly_base = data;
        showHideLoad(true);
    });

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('hourly_base/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(){
        showHideLoad();
        dataFactory.httpRequest('hourly_base/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.hourly_base = apiModifyTable($scope.hourly_base,response.id,response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('hourly_base/delete/'+item.id,'POST',{},$scope.form).then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.hourly_base.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.saveAdd = function(){
        showHideLoad();
        dataFactory.httpRequest('hourly_base','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.hourly_base.push(response);
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('users_salaryController', function(dataFactory,$scope) {
    $scope.views = {};
    $scope.form = {};
    $scope.views.list = true;
    $scope.salary_base = {};
    $scope.hourly_base = {};
    $scope.employees = {};

    showHideLoad(true);
    $scope.search_users = function(){ 
        showHideLoad();
        $scope.show_results_table = true;
        dataFactory.httpRequest('users_salary/search','POST',{},{'user':$scope.form.user_search}).then(function(data) {
            $scope.employees = data.employees;
            $scope.salary_base = data.salary_base;
            $scope.hourly_base = data.hourly_base;
            showHideLoad(true);
        });
    }

    $scope.edit = function(employee){
        $scope.form = employee;
        $scope.modalTitle = "Edit employee salary base";
        $scope.edit_base_modal = !$scope.edit_base_modal;
        if(!$scope.form.salary_type){
            $scope.form.salary_type = "monthly";
        }
    }

    $scope.update_user_salary = function(){
        showHideLoad();
        dataFactory.httpRequest('users_salary/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.edit_base_modal = !$scope.edit_base_modal;
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.lists = false;
        $scope.views.edit = false;
        $scope.views.editSub = false;
        $scope.views.addSub = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('payroll_make_payController', function(dataFactory,$rootScope,$scope) {
    $scope.views = {};
    $scope.form = {};
    $scope.views.list = true;
    $scope.salary_base = {};
    $scope.hourly_base = {};
    $scope.employees = {};

    showHideLoad(true);
    $scope.search_users = function(){ 
        showHideLoad();
        $scope.show_results_table = true;
        dataFactory.httpRequest('make_payment/search','POST',{},{'user':$scope.form.user_search}).then(function(data) {
            $scope.employees = data.employees;
            $scope.salary_base = data.salary_base;
            $scope.hourly_base = data.hourly_base;
            $scope.currency_symbol = data.currency_symbol;
            showHideLoad(true);
        });
    }

    $scope.make_payment = function(id){
        showHideLoad();
        dataFactory.httpRequest('make_payment/'+id).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.changeView('make_payment');
                $scope.user_data = response;
                $scope.form.userid = $scope.user_data.user.id;
                $scope.form.pay_overtime_count = 0;
                $scope.recalculate_salary();
            }
            showHideLoad(true);
        });
    }

    $scope.make_user_payment_submit = function(){
        showHideLoad();
        dataFactory.httpRequest('make_payment/'+$scope.form.userid,'POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'remove');
            if(data.status == "success"){
                $scope.user_data = response;
                $scope.form = {};
                $scope.form.userid = $scope.user_data.user.id;
                $scope.form.pay_overtime_count = 0;
            }
            showHideLoad(true);
        });
    }

    $scope.recalculate_salary = function(){
        $scope.form.pay_amount = 0;
        if($scope.user_data.user.salary_type == "monthly"){
            $scope.form.pay_amount += parseInt($scope.user_data.user.salary_details.net_salary);
            $scope.form.pay_amount += parseInt($scope.user_data.user.salary_details.hour_overtime * $scope.form.pay_overtime_count);
        }

        if($scope.user_data.user.salary_type == "hourly"){
            $scope.form.pay_amount += parseInt($scope.user_data.user.salary_details.hourly_cost * $scope.form.pay_hours);
        }
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('make_payment/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.user_data.history.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.changeView = function(view){
        $scope.views.list = false;
        $scope.views.make_payment = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('rolesController', function(dataFactory,$sce,$rootScope,$scope) {
    $scope.roles = {};
    $scope.roles_perms = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(){
        dataFactory.httpRequest('roles/listAll').then(function(data) {
            $scope.roles = data.roles;
            $scope.roles_perms = data.roles_perms;
            showHideLoad(true);
        });
    }
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('roles','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('roles/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.roles.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('roles/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('roles/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('roles/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('wel_office_cat', function(dataFactory,$sce,$rootScope,$scope) {
    $scope.wel_office = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(){
        dataFactory.httpRequest('wel_office_cat/listAll').then(function(data) {
            $scope.wel_office = data.wel_office;
            showHideLoad(true);
        });
    }
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('wel_office_cat','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('wel_office_cat/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.wel_office.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('wel_office_cat/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('wel_office_cat/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('wel_office_cat/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }

    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('visitors', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.visitors = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.visitorsTemp)){

            showHideLoad();
            dataFactory.httpRequest('visitors/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.visitors = data.visitors;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('visitors/listAll/'+pageNumber).then(function(data) {
                $scope.visitors = data.visitors;
                if( pageNumber == 1){
                    $scope.wel_office = data.wel_office;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.visitorsTemp)){
                $scope.visitorsTemp = $scope.visitors;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.visitors = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.visitorsTemp)){
                $scope.visitors = $scope.visitorsTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.visitorsTemp = {};
            }
        }
    }

    
    $scope.view_details = function(id){
        showHideLoad();
        dataFactory.httpRequest('visitors/view/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('view');
            showHideLoad(true);
        });
    }

    if($routeParams.viewId){
        $scope.view_details($routeParams.viewId);
    }else{
        $scope.load_data();
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('visitors','POST',{},$scope.form,"docs,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('visitors/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.visitors.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('visitors/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('visitors/'+$scope.form.id,'POST',{},$scope.form,"docs,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('visitors/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }

    $scope.openSearchModal_student = function(){
        $scope.modalTitle = $rootScope.phrase.searchUsers;
        $scope.showUsrSearchModal_student = !$scope.showUsrSearchModal_student;
    }

    $scope.searchUserButton_student = function(){
        var searchAbout = $("#searchLink_student").val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest("visitors/searchUser/"+searchAbout).then(function(data) {
            $scope.searchResults_student = data;
        });
    }

    $scope.serachUserFinish_student = function(user){
        if(typeof $scope.form.student == "undefined"){
            $scope.form.student = [];
        }
        $scope.form.student.push({"user":user.name,"id": "" + user.id + "" });
        $scope.form.student_ser = JSON.stringify($scope.form.student);
        $scope.showUsrSearchModal_student = !$scope.showUsrSearchModal_student;
    }

    $scope.removeUserSearch_student = function(user_id){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.student) {
                if($scope.form.student[x].id == user_id){
                    $scope.form.student.splice(x,1);
                    $scope.form.student_ser = JSON.stringify($scope.form.student);
                    break;
                }
            }
        }
    }

    $scope.openSearchModal_to_meet = function(){
        $scope.modalTitle = $rootScope.phrase.searchUsers;
        $scope.showUsrSearchModal_to_meet = !$scope.showUsrSearchModal_to_meet;
    }

    $scope.searchUserButton_to_meet = function(){
        var searchAbout = $("#searchLink_to_meet").val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest("visitors/searchUser/"+searchAbout).then(function(data) {
            $scope.searchResults_to_meet = data;
        });
    }

    $scope.serachUserFinish_to_meet = function(user){
        if(typeof $scope.form.to_meet == "undefined"){
            $scope.form.to_meet = [];
        }
        $scope.form.to_meet.push({"user":user.name,"id": "" + user.id + "" });
        $scope.form.to_meet_ser = JSON.stringify($scope.form.to_meet);
        $scope.showUsrSearchModal_to_meet = !$scope.showUsrSearchModal_to_meet;
    }

    $scope.removeUserSearch_to_meet = function(user_id){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.to_meet) {
                if($scope.form.to_meet[x].id == user_id){
                    $scope.form.to_meet.splice(x,1);
                    $scope.form.to_meet_ser = JSON.stringify($scope.form.to_meet);
                    break;
                }
            }
        }
    }

    $scope.check_out = function(id){
        showHideLoad();
        dataFactory.httpRequest('visitors/'+id).then(function(data) {
            $scope.modalTitle = $rootScope.phrase.chkout;
            $scope.chkout_modal = !$scope.chkout_modal;
            $scope.modalClass = "modal-lg";
            $scope.form = data;
            $scope.form.check_out = {};
            showHideLoad(true);
        });
    }

    $scope.check_out_apply = function(){
        dataFactory.httpRequest('visitors/checkout/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.chkout_modal = !$scope.chkout_modal;
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('phone_calls', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.phone_calls = {};
    $scope.wel_office = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.phone_callsTemp)){

            showHideLoad();
            dataFactory.httpRequest('phone_calls/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.phone_calls = data.phone_calls;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('phone_calls/listAll/'+pageNumber).then(function(data) {
                $scope.phone_calls = data.phone_calls;
                if( pageNumber == 1){
                    $scope.wel_office = data.wel_office;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.phone_callsTemp)){
                $scope.phone_callsTemp = $scope.phone_calls;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.phone_calls = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.phone_callsTemp)){
                $scope.phone_calls = $scope.phone_callsTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.phone_callsTemp = {};
            }
        }
    }

    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('phone_calls','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('phone_calls/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.phone_calls.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('phone_calls/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('phone_calls/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('phone_calls/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.call_details = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('postal', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.postal = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.postalTemp)){

            showHideLoad();
            dataFactory.httpRequest('postal/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.postal = data.postal;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('postal/listAll/'+pageNumber).then(function(data) {
                $scope.postal = data.postal;
                
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.postalTemp)){
                $scope.postalTemp = $scope.postal;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.postal = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.postalTemp)){
                $scope.postal = $scope.postalTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.postalTemp = {};
            }
        }
    }

    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('postal','POST',{},$scope.form,"attachment,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('postal/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.postal.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('postal/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('postal/'+$scope.form.id,'POST',{},$scope.form,"attachment,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('postal/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.postal_desc = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('con_mess', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.contact_messages = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.contact_messagesTemp)){

            showHideLoad();
            dataFactory.httpRequest('con_mess/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.contact_messages = data.contact_messages;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('con_mess/listAll/'+pageNumber).then(function(data) {
                $scope.contact_messages = data.contact_messages;
                
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.contact_messagesTemp)){
                $scope.contact_messagesTemp = $scope.contact_messages;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.contact_messages = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.contact_messagesTemp)){
                $scope.contact_messages = $scope.contact_messagesTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.contact_messagesTemp = {};
            }
        }
    }

    
    $scope.view_details = function(id){
        showHideLoad();
        dataFactory.httpRequest('con_mess/view/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('view');
            showHideLoad(true);
        });
    }

    if($routeParams.viewId){
        $scope.view_details($routeParams.viewId);
    }else{
        $scope.load_data();
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('con_mess','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('con_mess/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.contact_messages.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('con_mess/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('con_mess/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('con_mess/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('departments', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.departments = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('departments/listAll').then(function(data) {
            $scope.departments = data.departments;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('departments','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('departments/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.departments.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('departments/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('departments/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('departments/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('designations', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.designations = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('designations/listAll').then(function(data) {
            $scope.designations = data.designations;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('designations','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('designations/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.designations.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('designations/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('designations/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('designations/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('enquiries', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.enquiries = {};
    $scope.enq_type = {};
    $scope.enq_source = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.enquiriesTemp)){

            showHideLoad();
            dataFactory.httpRequest('enquiries/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.enquiries = data.enquiries;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('enquiries/listAll/'+pageNumber).then(function(data) {
                $scope.enquiries = data.enquiries;
                if( pageNumber == 1){
                    $scope.enq_type = data.enq_type;
                    $scope.enq_source = data.enq_source;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.enquiriesTemp)){
                $scope.enquiriesTemp = $scope.enquiries;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.enquiries = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.enquiriesTemp)){
                $scope.enquiries = $scope.enquiriesTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.enquiriesTemp = {};
            }
        }
    }

    
    $scope.view_details = function(id){
        showHideLoad();
        dataFactory.httpRequest('enquiries/view/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('view');
            showHideLoad(true);
        });
    }

    if($routeParams.viewId){
        $scope.view_details($routeParams.viewId);
    }else{
        $scope.load_data();
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('enquiries','POST',{},$scope.form,"enq_file,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('enquiries/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.enquiries.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('enquiries/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('enquiries/'+$scope.form.id,'POST',{},$scope.form,"enq_file,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('enquiries/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.enq_desc = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('complaints', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.complaints = {};
    $scope.comp_type = {};
    $scope.comp_source = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.complaintsTemp)){

            showHideLoad();
            dataFactory.httpRequest('complaints/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.complaints = data.complaints;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('complaints/listAll/'+pageNumber).then(function(data) {
                $scope.complaints = data.complaints;
                if( pageNumber == 1){
                    $scope.comp_type = data.comp_type;
                    $scope.comp_source = data.comp_source;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.complaintsTemp)){
                $scope.complaintsTemp = $scope.complaints;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.complaints = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.complaintsTemp)){
                $scope.complaints = $scope.complaintsTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.complaintsTemp = {};
            }
        }
    }

    
    $scope.view_details = function(id){
        showHideLoad();
        dataFactory.httpRequest('complaints/view/'+id).then(function(data) {
            $scope.form = data;
            $scope.changeView('view');
            showHideLoad(true);
        });
    }

    if($routeParams.viewId){
        $scope.view_details($routeParams.viewId);
    }else{
        $scope.load_data();
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('complaints','POST',{},$scope.form,"enq_file,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('complaints/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.complaints.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('complaints/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('complaints/'+$scope.form.id,'POST',{},$scope.form,"enq_file,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('complaints/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.comp_desc = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('inv_cat', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.inv_cat = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('inv_cat/listAll').then(function(data) {
            $scope.inv_cat = data.inv_cat;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('inv_cat','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('inv_cat/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.inv_cat.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('inv_cat/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('inv_cat/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('inv_cat/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('suppliers', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.suppliers = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.suppliersTemp)){

            showHideLoad();
            dataFactory.httpRequest('suppliers/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.suppliers = data.suppliers;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('suppliers/listAll/'+pageNumber).then(function(data) {
                $scope.suppliers = data.suppliers;
                
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.suppliersTemp)){
                $scope.suppliersTemp = $scope.suppliers;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.suppliers = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.suppliersTemp)){
                $scope.suppliers = $scope.suppliersTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.suppliersTemp = {};
            }
        }
    }

    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('suppliers','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('suppliers/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.suppliers.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('suppliers/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('suppliers/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('suppliers/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});
OraSchool.controller('stocksstores', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.stores = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('stores/listAll').then(function(data) {
            $scope.stores = data.stores;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('stores','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('stores/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.stores.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('stores/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('stores/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('stores/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('items_code', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.items_code = {};
    $scope.inv_cat = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.items_codeTemp)){

            showHideLoad();
            dataFactory.httpRequest('items_code/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.items_code = data.items_code;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('items_code/listAll/'+pageNumber).then(function(data) {
                $scope.items_code = data.items_code;
                if( pageNumber == 1){
                    $scope.inv_cat = data.inv_cat;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.items_codeTemp)){
                $scope.items_codeTemp = $scope.items_code;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.items_code = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.items_codeTemp)){
                $scope.items_code = $scope.items_codeTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.items_codeTemp = {};
            }
        }
    }

    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('items_code','POST',{},$scope.form).then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('items_code/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.items_code.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('items_code/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('items_code/'+$scope.form.id,'POST',{},$scope.form).then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('items_code/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('items_stock', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.items_stock = {};
    $scope.inv_cat = {};
    $scope.items_code = {};
    $scope.items_code_edit = {};
    $scope.stores = {};
    $scope.suppliers = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.items_stockTemp)){

            showHideLoad();
            dataFactory.httpRequest('items_stock/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.items_stock = data.items_stock;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('items_stock/listAll/'+pageNumber).then(function(data) {
                $scope.items_stock = data.items_stock;
                if( pageNumber == 1){
                    $scope.inv_cat = data.inv_cat;
                    $scope.items_code = data.items_code;
                    $scope.stores = data.stores;
                    $scope.suppliers = data.suppliers;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.items_stockTemp)){
                $scope.items_stockTemp = $scope.items_stock;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.items_stock = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.items_stockTemp)){
                $scope.items_stock = $scope.items_stockTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.items_stockTemp = {};
            }
        }
    }

    $scope.load_data();

    $scope.load_items = function(){
        showHideLoad();
        dataFactory.httpRequest('items_stock/load_items/'+$scope.form.cat_id,'POST').then(function(data) {
            $scope.items_code_edit = data;
            showHideLoad(true);
        });
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('items_stock','POST',{},$scope.form,"stock_attach,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('items_stock/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.items_stock.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('items_stock/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            $scope.load_items();
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('items_stock/'+$scope.form.id,'POST',{},$scope.form,"stock_attach,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('items_stock/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('inv_issue', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.inv_issue = {};
    $scope.inv_cat = {};
    $scope.items_code = {};
    $scope.items_code_edit = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    $scope.load_data = function(pageNumber) {

        if(typeof pageNumber == "undefined"){
            pageNumber = $scope.pageNumber;
        }
        $scope.pageNumber = pageNumber;

        if(! $.isEmptyObject($scope.inv_issueTemp)){

            showHideLoad();
            dataFactory.httpRequest('inv_issue/search/'+$scope.searchText+'/'+pageNumber).then(function(data) {
                $scope.inv_issue = data.inv_issue;
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });

        }else{

            showHideLoad();
            dataFactory.httpRequest('inv_issue/listAll/'+pageNumber).then(function(data) {
                $scope.inv_issue = data.inv_issue;
                if( pageNumber == 1){
                    $scope.inv_cat = data.inv_cat;
                $scope.items_code = data.items_code;
                }
                $scope.totalItems = data.totalItems;
                showHideLoad(true);
            });
            
        }
    }

    $scope.pageChanged = function(newPage) {
        $scope.load_data(newPage);
    };

    $scope.searchDB = function(){
        if($scope.searchText.length >= 3){
            if($.isEmptyObject($scope.inv_issueTemp)){
                $scope.inv_issueTemp = $scope.inv_issue;
                $scope.totalItemsTemp = $scope.totalItems;
                $scope.inv_issue = {};
            }
            $scope.load_data(1);
        }else{
            if(! $.isEmptyObject($scope.inv_issueTemp)){
                $scope.inv_issue = $scope.inv_issueTemp;
                $scope.totalItems = $scope.totalItemsTemp;
                $scope.inv_issueTemp = {};
            }
        }
    }

    $scope.load_data();

    $scope.load_items = function(){
        showHideLoad();
        dataFactory.httpRequest('inv_issue/load_items/'+$scope.form.item_cat,'POST').then(function(data) {
            $scope.items_code_edit = data;
            showHideLoad(true);
        });
    }
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('inv_issue','POST',{},$scope.form,"attachment,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('inv_issue/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.inv_issue.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('inv_issue/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('inv_issue/'+$scope.form.id,'POST',{},$scope.form,"attachment,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.return_item = function(id){
        var confirmRemove = confirm($rootScope.phrase.sureReturn);
        if (confirmRemove == true) {
            dataFactory.httpRequest('inv_issue/return/'+id,'POST',{},{}).then(function(data) {
                showHideLoad();

                response = apiResponse(data,'edit');
                if(data.status == "success"){
                    $scope.load_data();
                    $scope.changeView('list');
                }
                showHideLoad(true);
            });
        }
    }

    $scope.openSearchModal_issue_tu = function(){
        $scope.modalTitle = $rootScope.phrase.searchUsers;
        $scope.showUsrSearchModal_issue_tu = !$scope.showUsrSearchModal_issue_tu;
    }

    $scope.searchUserButton_issue_tu = function(){
        var searchAbout = $("#searchLink_issue_tu").val();
        if(searchAbout.length < 3){
            alert($rootScope.phrase.minCharLength3);
            return;
        }
        dataFactory.httpRequest("inv_issue/searchUser/"+searchAbout).then(function(data) {
            $scope.searchResults_issue_tu = data;
        });
    }

    $scope.serachUserFinish_issue_tu = function(user){
        $scope.form.issue_tu = [];
        $scope.form.issue_tu.push({"user":user.name,"id": "" + user.id + "" });
        $scope.form.issue_tu_ser = JSON.stringify($scope.form.issue_tu);
        $scope.showUsrSearchModal_issue_tu = !$scope.showUsrSearchModal_issue_tu;
    }

    $scope.removeUserSearch_issue_tu = function(user_id){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            for (x in $scope.form.issue_tu) {
                if($scope.form.issue_tu[x].id == user_id){
                    $scope.form.issue_tu.splice(x,1);
                    $scope.form.issue_tu_ser = JSON.stringify($scope.form.issue_tu);
                    break;
                }
            }
        }
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});

OraSchool.controller('certificatesController', function(dataFactory,$sce,$rootScope,$scope,$routeParams) {
    $scope.certificates = {};
    $scope.views = {};
    $scope.views.list = true;
    $scope.pageNumber = 1;
    $scope.form = {};
    
    
    $scope.load_data = function(){
        dataFactory.httpRequest('certificates/listAll').then(function(data) {
            $scope.certificates = data.certificates;
            showHideLoad(true);
        });
    }
    
    $scope.load_data();
    
    $scope.saveAdd = function(data){
        showHideLoad();
        dataFactory.httpRequest('certificates','POST',{},$scope.form,"certificate_image,").then(function(data) {
            response = apiResponse(data,'add');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.remove = function(item,index){
        var confirmRemove = confirm($rootScope.phrase.sureRemove);
        if (confirmRemove == true) {
            showHideLoad();
            dataFactory.httpRequest('certificates/delete/'+item.id,'POST').then(function(data) {
                response = apiResponse(data,'remove');
                if(data.status == "success"){
                    $scope.certificates.splice(index,1);
                }
                showHideLoad(true);
            });
        }
    }

    $scope.edit = function(id){
        showHideLoad();
        dataFactory.httpRequest('certificates/'+id).then(function(data) {
            $scope.changeView('edit');
            $scope.form = data;
            showHideLoad(true);
        });
    }

    $scope.saveEdit = function(data){
        dataFactory.httpRequest('certificates/'+$scope.form.id,'POST',{},$scope.form,"certificate_image,").then(function(data) {
            showHideLoad();

            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
                $scope.changeView('list');
            }
            showHideLoad(true);
        });
    }

    $scope.status =function(id,$index){
        showHideLoad();
        dataFactory.httpRequest('certificates/active/'+id,'POST').then(function(data) {
            response = apiResponse(data,'edit');
            if(data.status == "success"){
                $scope.load_data();
            }
            showHideLoad(true);
        });
    }
    
    $scope.changeView = function(view){
        if(view == "add" || view == "list" || view == "show"){
            $scope.form = {};
            $scope.header_left = "";$scope.header_right = "";$scope.header_middle = "";$scope.main_title = "";$scope.main_content = "";$scope.footer_left = "";$scope.footer_right = "";$scope.footer_middle = "";
        }
        $scope.views.list = false;
        $scope.views.add = false;
        $scope.views.edit = false;
        $scope.views.view = false;
        $scope.views[view] = true;
    }
});