/**
 * Created by Andrés on 27/04/2015.
 */

var system = new system();

angular.module("styles", ['scrollbar'])
    .controller('StylesController', function ($scope) {
        $scope.data = {
            messageActive: -1,
            showOverlay: false,
            showSidebar: false,
            showMenu: false,
            showCompose: false
        };

        $scope.clickOnThread = function(event, index) {
            //If we click on toggle button, nothing should happen
            if (event.target.tagName == "LABEL") return;

            //If we...
            if ($scope.data.messageActive != -1 && $scope.data.messageActive == index) {
                //Click on selected thread, we should unselect it
                $scope.showThread(-1);
            } else {
                //If not, if...
                if ($scope.data.messageActive != -1) {
                    //If there is a selected thread, we should unselect it and show new thread in 300ms
                    $scope.showThread(-1);
                    setTimeout(function() {
                        $scope.$apply(function () {
                            $scope.showThread(index);
                        });
                    }, 300);
                } else {
                    //If not, we simply show new thread
                    $scope.showThread(index);
                }
            }
        }

        $scope.showThread = function(index) {
            $scope.data.messageActive = index;
            $scope.data.showOverlay = (index > -1);
        }

        $scope.isUnread = function(labels) {
            for (i in labels) {
                if (labels[i] === "UNREAD") return true;
            }
            return false;
        }

        $scope.clickOnHideThread = function () {
            $scope.data.messageActive = -1;
            $scope.data.showOverlay = false;
        }

        $scope.clickOnToggleSidebar = function () {
            $scope.data.showOverlay = true;
            $scope.data.showSidebar = true;
        }

        $scope.clickOnOverlay = function () {
            $scope.data.showOverlay = false;
            $scope.data.messageActive = -1;
            $scope.data.showSidebar = false;
        }

        $scope.clickOnCompose = function () {
            $scope.data.showCompose = !$scope.data.showCompose;
        }

        $scope.clickOnCheckbox = function (event, index) {
            event.stopImmediatePropagation();
        }

        $scope.clickShowMenu = function() {
            if (!system.isMobile()) $scope.data.showMenu = !$scope.data.showMenu;
        }
    });
