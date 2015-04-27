/**
 * Created by Andrés on 27/04/2015.
 */

angular.module("styles", ['scrollbar'])
    .controller('StylesController', function ($scope) {
        $scope.data = {
            messageActive: -1,
            showOverlay: false,
            showSidebar: false,
            showMenu: false
        };

        $scope.clickOnThread = function(event, index) {
            //If we click on toggle button, nothing should happen
            if (event.target.tagName == "LABEL") {
                return;
            }

            //If we...
            if ($scope.data.messageActive != -1 && $scope.data.messageActive == index) {
                //Click on selected thread, we should unselect it
                $scope.data.messageActive = -1;
                $scope.data.showOverlay = false;
            } else {
                //If not, if...
                if ($scope.data.messageActive != -1) {
                    //If there is a selected thread, we should unselect it and show new thread in 300ms
                    $scope.data.messageActive = -1;
                    $scope.data.showOverlay = false;
                    setTimeout(function() {
                        $scope.$apply(function () {
                            $scope.data.messageActive = index;
                            $scope.data.showOverlay = true;
                        });
                    }, 300);
                } else {
                    //If not, we simply show new thread
                    $scope.data.messageActive = index;
                    $scope.data.showOverlay = true;
                }
            }
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

        $scope.clickOnCheckbox = function (event, index) {
            event.stopImmediatePropagation();
        }

        $scope.clickShowMenu = function() {
            $scope.data.showMenu = !$scope.data.showMenu;
        }
    });
