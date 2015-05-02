/**
 * Created by Andrés on 02/05/2015.
 */

angular.module("email", [])
    .controller('EmailTemplateController', function ($scope) {
        $scope.data = {
            active: 'write',
            showDropdown: false,
            showCc: false,
            showBcc: false
        }

        $scope.showDropdown = function() {
            $scope.data.showDropdown = !$scope.data.showDropdown;
        }

        $scope.showCc = function() {
            $scope.data.showCc = !$scope.data.showCc;
        }

        $scope.showBcc = function() {
            $scope.data.showBcc = !$scope.data.showBcc;
        }

        $scope.setActive = function(active) {
            if ($scope.data.active != active) $scope.data.active = active;
        }
    });

