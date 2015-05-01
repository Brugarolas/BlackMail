+function ($) { 'use strict'; 
   var togglr = '[data-toggle=address]'
     , remove = '[data-toggle="remove"]'

   $(togglr).on('click', function (e) {
     var target = $(this).data('target')

     $(target).toggleClass('active')
     
     e.preventDefault()
   });

  $(remove).on('click', function (e) {
    var parent = $(this).parent();
    
    if ($(parent).hasClass('active')) {
      $(parent).removeClass('active')
      $(parent, 'input').val('');
    }
      
    e.preventDefault()
  });
               
               
 }(window.jQuery);