jQuery(document).ready(function($) {

	var cols = {},	messageIsOpen = false;

	cols.showOverlay = function() {
		$('body').addClass('show-main-overlay');
	};
	cols.hideOverlay = function() {
		$('body').removeClass('show-main-overlay');
	};

	cols.showMessage = function() {
		$('body').addClass('show-message');
		messageIsOpen = true;
	};
	cols.hideMessage = function() {
		$('body').removeClass('show-message');
		$('#main .message-list li').removeClass('active');
		messageIsOpen = false;
	};

	cols.showSidebar = function() {
		$('body').addClass('show-sidebar');
	};
	cols.hideSidebar = function() {
		$('body').removeClass('show-sidebar');
	};

	// Show sidebar when trigger is clicked
	/* HECHO CON ANGULARJS */
	$('.trigger-toggle-sidebar').on('click', function() {
		cols.showSidebar();
		cols.showOverlay();
	});

	/* HECHO CON ANGULARJS */
	$('.trigger-message-close').on('click', function() {
		cols.hideMessage();
		cols.hideOverlay();
	});

	// When you click on a message, show it
	/* HECHO CON ANGULARJS */
	$('#main .message-list li').on('click', function(e) {
		var item = $(this),
			target = $(e.target);

		console.log(item);
		console.log(target);

		if(target.is('label')) {
			item.toggleClass('selected');
		} else {
			if(messageIsOpen && item.is('.active')) {
				cols.hideMessage();
				cols.hideOverlay();
			} else {
				if(messageIsOpen) {
					cols.hideMessage();
					item.addClass('active');
					setTimeout(function() {
						cols.showMessage();
					}, 300);
				} else {
					item.addClass('active');
					cols.showMessage();
				}
				cols.showOverlay();
			}
		}
	});

	// This will prevent click from triggering twice when clicking checkbox/label
	$('input[type=checkbox]').on('click', function(e) {
		e.stopImmediatePropagation();
	});

	// When you click the overlay, close everything
    /* HECHO CON ANGULARJS */
	$('#main > .overlay').on('click', function() {
		cols.hideOverlay();
		cols.hideMessage();
		cols.hideSidebar();
	});

	// Enable sexy scrollbars
    /* HECHO CON ANGULARJS */
	$('.nano').nanoScroller();

	// Disable links
	$('a').on('click', function(e) {
		e.preventDefault();
	});

	// Search box responsive stuff
	$('.search-box input').on('focus', function() {
		if($(window).width() <= 1360) {
			cols.hideMessage();
		}
	});
});
