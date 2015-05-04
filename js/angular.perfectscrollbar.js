/**
 * Created by Andrés on 27/04/2015.
 */

angular.module("scrollbar", []).
    directive('perfectScrollbar', function ($compile) {
        return {
            controller: function ($scope) {  },
            link: function (scope, element, attrs, ctrl) {
                Ps.initialize(element[0], {
                    wheelPropagation: true,
                    swipePropagation: true
                });
            }
        }
    });