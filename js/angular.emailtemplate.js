/**
 * Created by Andrés on 02/05/2015.
 */

angular.module("email", [])
    .controller('EmailTemplateController', function ($scope) {
        $scope.data = {
            showCc: false,
            showBcc: false
        }

        $scope.showCc = function() {
            $scope.data.showCc = !$scope.data.showCc;
        }

        $scope.showBcc = function() {
            $scope.data.showBcc = !$scope.data.showBcc;
        }
    });

