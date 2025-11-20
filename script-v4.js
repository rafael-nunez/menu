// Configuration constants
// TRANSITION_DURATION is read from CSS --transition-duration variable (see init function)
let TRANSITION_DURATION = 600; // Default fallback value in milliseconds
const CLOSE_DELAY = 0; // Configurable delay before closing dropdown (in milliseconds)
const DEBOUNCE_DELAY = 50; // Debounce delay for mouse events
const MOBILE_BREAKPOINT = 768; // Width below which we use hamburger menu (matches CSS)

// State management
let currentOpenDropdown = null;
let dropdownTimeout = null;
let debounceTimeout = null;
let lastFocusedElement = null;
let mobileMenuOpen = false;

// Get DOM elements
const menuWrapper = document.querySelector('.menu-wrapper');
const dropdownArea = document.querySelector('.dropdown-area');
const menuButtons = document.querySelectorAll('[data-dropdown]');
const backdrop = document.querySelector('.menu-backdrop');
const hamburgerButton = document.querySelector('.hamburger-button');
const mobileNav = document.querySelector('.mobile-nav');
const mobileNavClose = document.querySelector('.mobile-nav-close');
const mobileAccordionButtons = document.querySelectorAll('.mobile-accordion-button');

/**
 * Check if we're in mobile mode (hamburger menu)
 */
function isMobileMode() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * Debounce function to limit event firing rate
 */
function debounce(func, delay) {
    return function(...args) {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Shows a specific dropdown (desktop only)
 */
function showDropdown(dropdownId, button) {
    // Only work on desktop
    if (isMobileMode()) return;

    // Clear any pending close timeout
    clearTimeout(dropdownTimeout);

    const targetDropdown = document.getElementById('dropdown-' + dropdownId);

    if (!targetDropdown) return;

    // If clicking the same button that's already open, close it
    if (currentOpenDropdown === targetDropdown && button) {
        hideDropdowns();
        return;
    }

    // Hide all dropdowns immediately
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
    });

    // Remove active class from all buttons
    menuButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
    });

    // Show the target dropdown and activate the area
    targetDropdown.classList.add('active');
    dropdownArea.classList.add('active');
    backdrop.classList.add('active');
    currentOpenDropdown = targetDropdown;

    // Add active class to the button and update ARIA
    if (button) {
        button.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
        lastFocusedElement = button;
    }

    // Enable tab navigation in dropdown links
    enableDropdownLinks(targetDropdown);
}

/**
 * Hides all dropdowns with animation (desktop only)
 */
function hideDropdowns() {
    // Only work on desktop
    if (isMobileMode()) return;

    // Remove active class from dropdown area first (starts collapse animation)
    dropdownArea.classList.remove('active');
    backdrop.classList.remove('active');

    // Remove active class from all buttons and update ARIA
    menuButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
    });

    // Wait for animation to complete before removing active from dropdowns
    dropdownTimeout = setTimeout(() => {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            dropdown.classList.remove('active');
            // Disable tab navigation in hidden dropdowns
            disableDropdownLinks(dropdown);
        });
        currentOpenDropdown = null;
    }, TRANSITION_DURATION);
}

/**
 * Opens the mobile hamburger menu
 */
function openMobileMenu() {
    if (!isMobileMode()) return;

    mobileNav.classList.add('active');
    backdrop.classList.add('active');
    hamburgerButton.setAttribute('aria-expanded', 'true');
    mobileMenuOpen = true;

    // Prevent body scroll when menu is open
    document.body.style.overflow = 'hidden';

    // Focus the close button for accessibility
    setTimeout(() => {
        mobileNavClose.focus();
    }, 100);
}

/**
 * Closes the mobile hamburger menu
 */
function closeMobileMenu() {
    mobileNav.classList.remove('active');
    backdrop.classList.remove('active');
    hamburgerButton.setAttribute('aria-expanded', 'false');
    mobileMenuOpen = false;

    // Restore body scroll
    document.body.style.overflow = '';

    // Return focus to hamburger button
    hamburgerButton.focus();
}

/**
 * Toggles mobile accordion sections
 */
function toggleMobileAccordion(button) {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const targetId = button.getAttribute('aria-controls');
    const targetContent = document.getElementById(targetId);

    if (!targetContent) return;

    if (isExpanded) {
        // Collapse
        button.setAttribute('aria-expanded', 'false');
        targetContent.classList.remove('active');
    } else {
        // Expand (multiple accordions can be open simultaneously)
        button.setAttribute('aria-expanded', 'true');
        targetContent.classList.add('active');
    }
}

/**
 * Enables keyboard navigation for dropdown links
 */
function enableDropdownLinks(dropdown) {
    const links = dropdown.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('tabindex', '0');
    });
}

/**
 * Disables keyboard navigation for dropdown links
 */
function disableDropdownLinks(dropdown) {
    const links = dropdown.querySelectorAll('a');
    links.forEach(link => {
        link.setAttribute('tabindex', '-1');
    });
}

/**
 * Handles keyboard navigation
 */
function handleKeyboardNavigation(event) {
    const key = event.key;
    const activeElement = document.activeElement;

    // Escape key - close dropdown or mobile menu
    if (key === 'Escape') {
        if (mobileMenuOpen) {
            event.preventDefault();
            closeMobileMenu();
            return;
        }
        if (currentOpenDropdown) {
            event.preventDefault();
            hideDropdowns();
            // Restore focus to the last focused menu button
            if (lastFocusedElement) {
                lastFocusedElement.focus();
            }
            return;
        }
    }

    // Desktop dropdown keyboard navigation
    if (!isMobileMode()) {
        // Enter or Space on menu buttons
        if ((key === 'Enter' || key === ' ') && activeElement.hasAttribute('data-dropdown')) {
            event.preventDefault();
            const dropdownId = activeElement.getAttribute('data-dropdown');
            const isExpanded = activeElement.getAttribute('aria-expanded') === 'true';

            if (isExpanded) {
                hideDropdowns();
            } else {
                showDropdown(dropdownId, activeElement);
                // Focus first link in dropdown
                setTimeout(() => {
                    const firstLink = currentOpenDropdown?.querySelector('a');
                    if (firstLink) {
                        firstLink.focus();
                    }
                }, 50);
            }
            return;
        }

        // Tab key management within dropdown
        if (key === 'Tab' && currentOpenDropdown) {
            const dropdownLinks = Array.from(currentOpenDropdown.querySelectorAll('a'));
            const firstLink = dropdownLinks[0];
            const lastLink = dropdownLinks[dropdownLinks.length - 1];

            // Shift+Tab on first link - go back to button
            if (event.shiftKey && activeElement === firstLink) {
                event.preventDefault();
                if (lastFocusedElement) {
                    lastFocusedElement.focus();
                }
            }
            // Tab on last link - close dropdown and move to next element
            else if (!event.shiftKey && activeElement === lastLink) {
                hideDropdowns();
            }
        }
    }

    // Mobile accordion keyboard navigation
    if (isMobileMode()) {
        // Enter or Space on accordion buttons
        if ((key === 'Enter' || key === ' ') && activeElement.classList.contains('mobile-accordion-button')) {
            event.preventDefault();
            toggleMobileAccordion(activeElement);
        }
    }
}

/**
 * Event delegation for mouse events (desktop only)
 */
function handleMouseEnter(event) {
    // Disable hover behavior in mobile mode
    if (isMobileMode()) return;

    const button = event.target.closest('[data-dropdown]');

    if (button) {
        const dropdownId = button.getAttribute('data-dropdown');
        debounce(() => showDropdown(dropdownId, button), DEBOUNCE_DELAY)();
    }
}

/**
 * Handle mouse leave with configurable delay (desktop only)
 */
function handleMouseLeave() {
    // Disable hover behavior in mobile mode
    if (isMobileMode()) return;

    debounce(() => {
        dropdownTimeout = setTimeout(() => {
            hideDropdowns();
        }, CLOSE_DELAY);
    }, DEBOUNCE_DELAY)();
}

/**
 * Handle window resize - close menus when switching between mobile/desktop
 */
function handleResize() {
    if (isMobileMode()) {
        // Switched to mobile - close any open desktop dropdowns
        if (currentOpenDropdown) {
            hideDropdowns();
        }
    } else {
        // Switched to desktop - close mobile menu
        if (mobileMenuOpen) {
            closeMobileMenu();
        }
    }
}

/**
 * Initialize all event listeners
 */
function init() {
    // Read transition duration from CSS custom property (single source of truth)
    const computedStyle = getComputedStyle(document.documentElement);
    const cssDuration = computedStyle.getPropertyValue('--transition-duration').trim();
    // Convert CSS duration (e.g., "0.6s") to milliseconds
    if (cssDuration.endsWith('s')) {
        TRANSITION_DURATION = parseFloat(cssDuration) * 1000;
    } else if (cssDuration.endsWith('ms')) {
        TRANSITION_DURATION = parseFloat(cssDuration);
    }

    // Desktop dropdown event delegation
    if (menuWrapper && dropdownArea) {
        menuWrapper.addEventListener('mouseenter', handleMouseEnter, true);
        menuWrapper.addEventListener('mouseleave', handleMouseLeave);

        // Prevent menu wrapper from losing hover state when moving between elements
        menuWrapper.addEventListener('mouseenter', () => {
            clearTimeout(dropdownTimeout);
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Desktop menu button click events
    if (menuButtons) {
        menuButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                if (isMobileMode()) return; // Ignore in mobile mode

                const dropdownId = button.getAttribute('data-dropdown');
                const isExpanded = button.getAttribute('aria-expanded') === 'true';

                if (isExpanded) {
                    hideDropdowns();
                } else {
                    showDropdown(dropdownId, button);
                }
            });
        });
    }

    // Hamburger button click event
    if (hamburgerButton) {
        hamburgerButton.addEventListener('click', () => {
            openMobileMenu();
        });
    }

    // Mobile menu close button
    if (mobileNavClose) {
        mobileNavClose.addEventListener('click', () => {
            closeMobileMenu();
        });
    }

    // Mobile accordion buttons
    if (mobileAccordionButtons) {
        mobileAccordionButtons.forEach(button => {
            button.addEventListener('click', () => {
                toggleMobileAccordion(button);
            });
        });
    }

    // Backdrop click - close mobile menu or desktop dropdown
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            if (mobileMenuOpen) {
                closeMobileMenu();
            } else if (currentOpenDropdown) {
                hideDropdowns();
            }
        });
    }

    // Initialize all desktop dropdowns as closed
    document.querySelectorAll('.dropdown').forEach(dropdown => {
        disableDropdownLinks(dropdown);
    });

    // Handle window resize
    window.addEventListener('resize', debounce(handleResize, 200));

    // Close dropdown/menu when clicking outside (mobile fallback)
    document.addEventListener('click', (event) => {
        if (isMobileMode() && currentOpenDropdown) {
            // Check if click is outside menu wrapper
            if (!menuWrapper.contains(event.target)) {
                hideDropdowns();
            }
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
