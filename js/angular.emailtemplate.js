/**
 * Created by Andrés on 02/05/2015.
 */

angular.module("email", ['offClick', 'monospaced.elastic'])
    .directive('ngEmailIframe', function ($compile) {
        return {
            controller: function ($scope) {
            },
            link: function (scope, element, attrs, ctrl) {
                var iframe = element[0], updateOn = attrs.ngUpdateOn;

                if (!updateOn) {
                    setIframeData(iframe, attrs.ngEmailIframe, 50);
                } else {
                    scope.$on(updateOn, function (event, data) {
                        setIframeData(iframe, attrs.ngEmailIframe, 0);
                    });
                }
            }
        }
    })
    .controller('EmailTemplateController', function ($scope) {
        $scope.data = {
            showDropdown: false,
            showCc: false,
            showBcc: false
        }

        $scope.toggleDropdown = function () {
            $scope.data.showDropdown = !$scope.data.showDropdown;
        }

        $scope.toggleCc = function () {
            $scope.data.showCc = !$scope.data.showCc;
        }

        $scope.toggleBcc = function () {
            $scope.data.showBcc = !$scope.data.showBcc;
        }

        $scope.setActive = function (active) {
            if ($scope.data.active != active) $scope.data.active = active;
        }

        $scope.updatePreview = function () {
            $scope.$broadcast('updatePreview', {});
        }
    });

