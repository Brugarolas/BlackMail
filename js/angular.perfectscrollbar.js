/**
 * Created by Andrés on 27/04/2015.
 */
"use strict";

angular.module("scrollbar", []).
    directive('perfectScrollbar', function ($compile) {
        return {
            controller: function ($scope) {  },
            link: function (scope, element, attrs, ctrl) {
                Ps.initialize(element[0], {
                    wheelPropagation: true,
                    swipePropagation: true
                });

                if (attrs.perfectScrollbar) scope.$on(attrs.perfectScrollbar, function(event, args) {
                    element[0].scrollTop = 0;
                    Ps.update(element[0]);
                });
            }
        }
    });