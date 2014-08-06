/**
 * selectKit - A jQuery plugin that makes select boxes look nicer.
 * @version v0.0.1
 * @link http://github.com/aslansky/selectkit
 * @license MIT
 */
/**
 * selectKit - A jQuery plugin that makes select boxes look nicer.
 * @version v0.0.1
 * @link http://github.com/aslansky/selectkit
 * @license MIT
 */
/**
 * selectKit - A jQuery plugin that makes select boxes look nicer.
 * @version v0.0.1
 * @link http://github.com/aslansky/selectkit
 * @license MIT
 */
/**
 * selectKit - A jQuery plugin that makes select boxes look nicer.
 * @version v0.0.1
 * @link http://github.com/aslansky/selectkit
 * @license MIT
 */
// TODO: select item when keyup / keydown

(function (factory) {
    'use strict';
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        factory(require('jquery'));
    } else {
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    var defaults = {
        langSingleDefaultText: 'Select an Option',
        langMultiDefaultText: 'Select Some Options',
        langNoSearchResultsText: 'No results match',
        langMultiSelectedText: '%s and %d others selected'
    };

    var SelectParser = (function() {
        function SelectParser() {
            this.options_index = 0;
            this.parsed = [];
        }

        SelectParser.prototype.add_node = function(child) {
            if (child.nodeName.toUpperCase() === 'OPTGROUP') {
                return this.add_group(child);
            } else {
                return this.add_option(child);
            }
        };

        SelectParser.prototype.add_group = function(group) {
            var group_position, option, _i, _len, _ref, _results;
            group_position = this.parsed.length;
            this.parsed.push({
                array_index: group_position,
                group: true,
                label: this.escapeExpression(group.label),
                children: 0,
                disabled: group.disabled
            });
            _ref = group.childNodes;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                option = _ref[_i];
                _results.push(this.add_option(option, group_position, group.disabled));
            }
            return _results;
        };

        SelectParser.prototype.add_option = function(option, group_position, group_disabled) {
            if (option.nodeName.toUpperCase() === 'OPTION') {
                if (option.text !== '') {
                    if (group_position != null) {
                        this.parsed[group_position].children += 1;
                    }
                    this.parsed.push({
                        array_index: this.parsed.length,
                        options_index: this.options_index,
                        value: option.value,
                        text: option.text,
                        html: option.innerHTML,
                        selected: option.selected,
                        disabled: group_disabled === true ? group_disabled : option.disabled,
                        group_array_index: group_position,
                        classes: option.className,
                        style: option.style.cssText
                    });
                } else {
                    this.parsed.push({
                        array_index: this.parsed.length,
                        options_index: this.options_index,
                        empty: true
                    });
                }
                return this.options_index += 1;
            }
        };

        SelectParser.prototype.escapeExpression = function(text) {
            var map, unsafe_chars;
            if ((text == null) || text === false) {
                return '';
            }
            if (!/[\&\<\>\"\'\`]/.test(text)) {
                return text;
            }
            map = {
                '<': '&lt;',
                '>': '&gt;',
                '""': '&quot;',
                '\'': '&#x27;',
                '`': '&#x60;'
            };
            unsafe_chars = /&(?!\w+;)|[\<\>\"\'\`]/g;
            return text.replace(unsafe_chars, function(chr) {
                return map[chr] || '&amp;';
            });
        };

        return SelectParser;

    })();

    SelectParser.select_to_array = function(select) {
        var child, parser, _i, _len, _ref;
        parser = new SelectParser();
        _ref = select.childNodes;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            child = _ref[_i];
            parser.add_node(child);
        }
        return parser.parsed;
    };

    var SelectKit = function ($ele, settings) {
        var _this = this;

        if (!SelectKit.isBrowserSupported()) {
            return;
        }

        this.clickTestAction = function(evt) {
            return SelectKit.testActive(evt, _this);
        };

        this.settings = settings;
        this.$select = $ele;
        this.$container = null;
        this.$search = [];
        this.open = false;
        this.settings.multi = !!this.$select.attr('multiple');
        this.settings.disabled = !!this.$select.attr('disabled');
        this.isDisabled = false;

        if (!this.settings.placeholder) {
            this.settings.placeholder = this.$select.attr('placeholder') || (this.settings.multi) ? this.settings.langMultiSelectedText : this.settings.langSingleDefaultText;
        }

        if (this.settings.reset && !this.settings.resetText) {
          this.settings.resetText = 'Any ' + this.settings.placeholder;
        }

        if(!this.settings.searchplaceholder){
            this.settings.searchplaceholder = '';
        }

        if(this.settings.submit && !this.settings.submitplaceholder){
            this.settings.submitplaceholder = 'Refresh';
        }

        this.render();
        this.initEvents();

        if (this.settings.disabled) {
            this.disable();
        }
    };

    SelectKit.prototype.initEvents = function () {
        var _this = this;

        this.$container.find('.selectkit-display').on('mousedown.selectkit', function (evt) {
            if (!$(evt.target).is('.selectkit-reset')) {
                _this.toggleDropdown(evt);
            }
        });

        this.$container.find('.selectkit-refresh').on('mousedown.selectkit', function (evt) {
            _this.toggleDropdown(evt);
        });

        this.$container.on('mouseup.selectkit', '.selectkit-reset', function (evt) {
            _this.reset();
        });

        this.$container.on('mousedown.selectkit', '.selectkit-reset', function (evt) {
            evt.stopPropagation();
        });

        this.$list.on('mouseup.selectkit', '.selectkit-choice', function (evt) {
          if (!$(evt.target).is('.selectkit-reset')) {
            _this.choiceMouseup(this);
            _this.allowBodyScroll();
          }
        });

        this.$dropdown.on('mouseenter.selectkit', function (evt) {
            _this.preventBodyScroll();
        });

        this.$dropdown.on('mouseleave.selectkit', function (evt) {
            _this.allowBodyScroll();
        });

        if (this.$search.length) {
            this.$search.bind('keyup.selectkit', function(evt) {
                _this.keydownCheck(evt);
            });
            this.$search.bind('keydown.selectkit', function(evt) {
                _this.keydownCheck(evt);
            });
        }
    };

    SelectKit.prototype.render = function () {
        var width = this.getSelectWidth();
        this.$select.hide();
        this.$select.wrap('<div class="selectkit"></div>');
        this.$container = this.$select.parent();
        this.$container.css('width', width + 'px');

        this.$container.append('<div class="selectkit-display"><span>' + this.settings.placeholder + '</span><i class="selectkit-caret"></i></div>');
        this.$display = this.$container.find('.selectkit-display');
        this.$text = this.$display.find('span');

        this.$container.append('<div class="selectkit-list"></div>');
        this.$dropdown = this.$container.find('.selectkit-list');

        if (this.settings.search) {
            this.$dropdown.append('<div class="selectkit-search"><input type="text" name="selectkit-search" placeholder="'+this.settings.searchplaceholder+'"></div>');
            this.$search = this.$dropdown.find('input');
        }

        this.$dropdown.append('<ul class="selectkit-choices"></ul>');
        this.$list = this.$container.find('.selectkit-choices');

        this.data = SelectParser.select_to_array(this.$select.get(0));
        this.$choices = this.renderList();
        if(this.settings.submit) {
            this.$dropdown.append('<div class="selectkit-submit"><a class="button selectkit-refresh"><span class="icon-refresh"></span>'+this.settings.submitplaceholder+'</a></div>');
        }
        this.setText();
    };

    SelectKit.prototype.renderList = function () {
        var _this = this;
        this.$list.empty();
        $.each(this.data, function () {
            if (this.group) {
                _this.renderGroup(this);
            }
            else {
                _this.renderOption(this);
            }
        });
        return this.$container.find('.selectkit-choice');
    };

    SelectKit.prototype.renderGroup = function (data) {
        if (data.search_match !== false) {
            var $ele = $('<li class="selectkit-group" data-group-index="' + data.array_index + '">' + data.label + '</li>');
            $ele.data().data = data;
            this.$list.append($ele);
        }
    };

    SelectKit.prototype.renderOption = function (data) {
        if (data.empty) {
            this.empty_choice = data;
            var selected = this.getSelected();
            if (this.settings.reset && !this.$list.find('.selectkit-reset').length) {
              this.$list.prepend('<li class="selectkit-choice selectkit-reset">' + this.settings.resetText + '</li>');
            }
            return '';
        }
        else {
            if (data.search_match === false) {
                return '';
            }
            var text = data.search_text && data.search_text.length > 0 ? data.search_text : data.html;
            var $ele = $('<li class="selectkit-choice">' + text + '</li>');
            if (this.settings.multi && this.settings.checkbox) {
                $ele.prepend('<input type="checkbox" class="selectkit-check">');
                $ele.addClass('selectkit-choice-checkbox');
            }
            if (data.disabled) {
                $ele.find('input').prop('disabled', true);
                $ele.addClass('selectkit-disabled');
            }
            if (data.selected) {
                $ele.find('input').prop('checked', true);
                $ele.addClass('selectkit-selected');
            }
            if (data.group_array_index) {
                $ele.addClass('selectkit-group-item');
                $ele.attr('data-group-index',  data.group_array_index);
            }
            data.$ele = $ele;
            $ele.data().data = data;
            this.$list.append($ele);
            return $ele;
        }
    };

    SelectKit.prototype.toggleDropdown = function (evt) {
        evt.stopPropagation();
        if (!this.isDisabled) {
            if (this.open) {
                this.hide();
            }
            else {
                this.show();
            }
        }
    };

    SelectKit.prototype.show = function () {
        var _this = this;
        this.$dropdown.show();
        this.open = true;
        this.$container.addClass('selectkit-open');
        this.$container.addClass('selectkit-active');
        if (this.$search.length) {
          setTimeout(function () {
              _this.$search.focus();
          }, 500);
        }
        $(document).bind('click.selectkit', this.clickTestAction);
    };

    SelectKit.prototype.hide = function () {
        this.$dropdown.hide();
        this.open = false;
        this.$container.removeClass('selectkit-open');
        this.$container.removeClass('selectkit-active');
        $(document).unbind('click.selectkit', this.clickTestAction);
    };

    SelectKit.prototype.choiceMouseup = function (choice) {
        choice = $(choice).data().data;
        if (!choice.disabled) {
            if (this.settings.multi && choice.selected) {
                this.deSelectChoice(choice);
            }
            else {
                this.selectChoice(choice);
            }
        }
    };

    SelectKit.prototype.selectChoice = function (choice) {
        if (!this.settings.multi && this.getSelected()) {
            this.deSelectChoice(this.getSelected()[0]);
        }
        choice.selected = true;
        this.$select.find('option').get(choice.options_index).selected = true;
        this.renderList();
        this.setText();
        if (this.settings.hideOnSelect || !this.settings.multi) {
            this.hide();
        }
        this.$select.trigger('change');
    };

    SelectKit.prototype.deSelectChoice = function (choice) {
        var selected = this.getSelected().length;
        choice.selected = false;
        this.$select.find('option').get(choice.options_index).selected = false;
        this.renderList();
        this.setText();
        if (this.settings.hideOnSelect || !this.settings.multi) {
            this.hide();
        }
        if (this.settings.multi) {
            this.$select.trigger('change');
        }
    };

    SelectKit.prototype.keydownCheck = function (evt) {
        var stroke, _ref1;
        stroke = (_ref1 = evt.which) != null ? _ref1 : evt.keyCode;
        switch (stroke) {
            case 13:
            case 38:
            case 40:
            case 9:
            case 16:
            case 91:
            case 17:
                evt.preventDefault();
                break;
            default:
                return this.searchResults();
        }
    };

    SelectKit.prototype.setText = function (text) {
        var result = '';
        if (text) {
            result = text;
        }
        else {
            var selected = this.getSelected();
            if (selected && selected.length === 1) {
                result = selected[0].html;
            }
            else if (selected && selected.length > 1) {
                result = SelectKit.formatString(this.settings.langMultiSelectedText, selected[0].html, selected.length - 1);
            }
            else {
                result = this.settings.placeholder;
            }
        }
        this.$text.html(result);
        return result;
    };

    SelectKit.prototype.getSelected = function () {
        var selected = $.grep(this.data, function (a) {
            return a.selected;
        });
        return selected.length ? selected : null;
    };

    SelectKit.prototype.searchResults = function () {
        var escapedSearchText, option, regex, regexAnchor, results, results_group, searchText, startpos, text, zregex, _i, _len, _ref;
        this.clearNoResult();
        results = 0;
        searchText = this.getSearchText();
        escapedSearchText = searchText.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        regexAnchor = this.settings.searchContains ? '' : '^';
        regex = new RegExp(regexAnchor + escapedSearchText, 'i');
        zregex = new RegExp(escapedSearchText, 'i');
        _ref = this.data;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            option = _ref[_i];
            option.search_text = option.html || option.label;
            option.search_match = false;
            results_group = null;
            if (this.includeOptionInResults(option)) {
                option.search_match = this.stringMatch(option.search_text, regex);
                if (option.search_match) {
                    results += 1;
                    if (searchText.length) {
                        startpos = option.search_text.search(zregex);
                        text = option.search_text.substr(0, startpos + searchText.length) + '</em>' + option.search_text.substr(startpos + searchText.length);
                        option.search_text = text.substr(0, startpos) + '<em>' + text.substr(startpos);
                    }
                    option.search_match = true;
                }
                else {
                    option.search_match = false;
                }
            }
            else {
                option.search_match = false;
            }
        }
        if (results < 1 && searchText.length) {
            return this.setNoResult();
        } else {
            this.renderList();
        }
    };

    SelectKit.prototype.clearNoResult = function () {
        this.$list.find('.no-results').remove();
    };

    SelectKit.prototype.setNoResult = function () {
        this.$list.empty();
        return this.$list.append('<li class="no-results">' + this.settings.langNoSearchResultsText + '</li>');
    };

    SelectKit.prototype.stringMatch = function(search_string, regex) {
        var part, parts, _i, _len;
        if (regex.test(search_string)) {
            return true;
        } else if (search_string.indexOf(' ') >= 0 || search_string.indexOf('[') === 0) {
            parts = search_string.replace(/\[|\]/g, '').split(' ');
            if (parts.length) {
                for (_i = 0, _len = parts.length; _i < _len; _i++) {
                    part = parts[_i];
                    if (regex.test(part)) {
                        return true;
                    }
                }
            }
        }
    };

    SelectKit.prototype.includeOptionInResults = function(option) {
        if (option.disabled) {
            return false;
        }
        if (option.group) {
            return true;
        }
        if (option.empty) {
            return false;
        }
        return true;
    };


    SelectKit.prototype.reset = function () {
        $.each(this.data, function (i, item) {
            item.selected = undefined;
            item.search_match = undefined;
        });
        this.renderList();
        this.setText();
        if (this.settings.multi) {
            this.$select.find(':selected').each(function () {
                this.selected = false;
            });
        }
        this.$select.find('option').get(this.empty_choice.options_index).selected = true;
        this.$select.change();
        this.hide();
    };

    SelectKit.prototype.destroy = function () {
        this.$select.show();
        this.$container.before(this.$select);
        this.$container.remove();
    };

    SelectKit.prototype.disable = function () {
        this.isDisabled = true;
        this.$display.addClass('selectkit-disabled');
    };

    SelectKit.prototype.enable = function () {
        this.isDisabled = false;
        this.$display.removeClass('selectkit-disabled');
    };

    SelectKit.prototype.preventBodyScroll = function () {
        var $body = $('body');
        var oldWidth = $body.innerWidth();
        $body.css('overflow', 'hidden');
        $body.width(oldWidth);
    };

    SelectKit.prototype.allowBodyScroll = function () {
        var $body = $('body');
        $body.css('overflow', '');
        $body.css('width', '');
    };

    SelectKit.prototype.getSelectWidth = function() {
        if (this.settings.width != null) {
            return this.settings.width;
        } else {
            return this.$select.get(0).offsetWidth;
        }
    };

    SelectKit.prototype.getSearchText = function() {
        return (this.$search.val() === this.placeholder) ? '' : $('<div/>').text($.trim(this.$search.val())).html();
    };

    SelectKit.testActive = function (evt, scope) {
        var $activeContainer = $(evt.target).closest('.selectkit');
        if ($activeContainer.length && scope.$container.get(0) === $activeContainer.get(0)) {
            return true;
        } else {
            scope.hide();
            return false;
        }
    };

    SelectKit.isBrowserSupported = function () {
        if (window.navigator.appName === 'Microsoft Internet Explorer') {
            return document.documentMode >= 8;
        }
        if (/iP(od|hone)/i.test(window.navigator.userAgent)) {
            return false;
        }
        if (/Android/i.test(window.navigator.userAgent)) {
            if (/Mobile/i.test(window.navigator.userAgent)) {
                return false;
            }
        }
        return true;
    };

    SelectKit.formatString = function () {
        var a, b, c;
        a = arguments[0];
        b = [];
        for(c = 1; c < arguments.length; c++) {
            b.push(arguments[c]);
        }
        for(c in b) {
            a = a.replace(/%[a-z]/,b[c]);
        }
        return a;
    };

    $.fn.selectKit = function (options) {
        if (!SelectKit.isBrowserSupported()) {
            return this;
        }

        var settings = $.extend({}, defaults, options);

        return this.each(function() {
            var $this = $(this);
            if (options === undefined || $.isPlainObject(options)) {
                $this.data('selectkit', new SelectKit($this, $.extend({}, settings, $this.data())));
            }
            else {
                if ($this.data().selectkit) {
                    $this.data().selectkit[options].call($this.data().selectkit);
                }
            }
        });
    };
}));
