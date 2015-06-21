/**
 * Created by Andrés on 27/04/2015.
 */
"use strict";

angular.module("styles", ['scrollbar', 'email'])
    .controller('StylesController', function ($scope, $controller, $timeout) {
        $controller('EmailTemplateController', {$scope: $scope});
        $scope.data = {
            messageActive: -1,
            showOverlay: false,
            showSidebar: false,
            showMenu: false,
            showCompose: false
        };

        $scope.clickOnThread = function (event, index) {
            //If we click on toggle button, nothing should happen
            if (event.target.tagName == "LABEL") return;

            //If we...
            if ($scope.data.messageActive != -1 && $scope.data.messageActive == index) {
                //Click on selected thread, we should unselect it
                $scope.unselectThread(true);
            } else {
                //If not, if...
                if ($scope.data.messageActive != -1) {
                    //If there is a selected thread, we should unselect it and show new thread in 300ms
                    $scope.unselectThread(false);
                    $timeout(function () {
                        $scope.showThread(index);
                    }, 300);
                } else {
                    //If not, we simply show new thread
                    $scope.showThread(index);
                }
            }
        }

        $scope.clickOnHideThread = function () {
            $scope.unselectThread(true);
        }

        $scope.unselectThread = function (show) {
            $scope.data.messageActive = -1;
            if (show) $timeout(function () {
                $scope.data.messageExists = false;
            }, 500);
            $scope.data.showOverlay = false;
        }

        $scope.showThread = function (index) {
            $scope.data.messageExists = true;
            $scope.data.messageActive = index;
            $scope.data.showOverlay = true;
        }

        $scope.isUnread = function (labels) {
            for (var i in labels) if (labels[i] === "UNREAD") return true;
            return false;
        }

        $scope.clickOnToggleSidebar = function () {
            $scope.data.showOverlay = true;
            $scope.data.showSidebar = true;
        }

        $scope.clickOnOverlay = function () {
            $scope.data.showOverlay = false;
            $scope.data.messageActive = -1;
            $timeout(function () {
                $scope.data.messageExists = false;
            }, 500);
            $scope.data.showSidebar = false;
        }

        $scope.clickOnCompose = function () {
            if (!$scope.data.showCompose) $scope.data.composeExists = true;
            else $timeout(function () {
                $scope.data.composeExists = false;
            }, 500);

            $scope.data.showCompose = !$scope.data.showCompose;
        }

        $scope.clickOnCheckbox = function (event, index) {
            event.stopImmediatePropagation();
        }

        $scope.clickShowMenu = function () {
            if (!system.isMobile()) $scope.data.showMenu = !$scope.data.showMenu;
        }
    });
