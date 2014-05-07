/**
 * selectKit - A jQuery plugin that makes select boxes look nicer.
 * @version v0.0.1
 * @link http://github.com/aslansky/selectkit
 * @license MIT
 */
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

  var defaults = {};

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
    this.open = false;
    this.settings.multi = !!this.$select.attr('multiple');

    if (!this.settings.placeholder) {
      this.settings.placeholder = this.$select.attr('placeholder') || '&nbsp;';
    }

    this.render();
    this.initEvents();
  };

  SelectKit.prototype.render = function () {
    this.$select.wrap('<div class="selectkit"></div>');
    this.$container = this.$select.parent();
    if (this.$select.width() && this.$select.width() > 0) {
      this.$container.width(this.$select.width());
    }

    //this.$select.hide();

    this.$container.append('<div class="selectkit-display"><span>' + this.settings.placeholder + '</span><i class="selectkit-caret"></i></div>');
    this.$display = $('.selectkit-display', this.$container);
    this.$text = $('span', this.$display);

    this.$container.append('<div class="selectkit-list"></div>');
    this.$dropdown = $('.selectkit-list', this.$container);

    if (this.settings.search) {
      this.$dropdown.append('<div class="selectkit-search"><input type="text" name="selectkit-search"></div>');
    }

    this.$dropdown.append('<ul class="selectkit-choices"></ul>');
    this.$list = $('.selectkit-choices', this.$container);

    this.$choices = this.renderList();
  };

  SelectKit.prototype.renderList = function () {
    var _this = this;
    this.data = SelectParser.select_to_array(this.$select.get(0));
    $.each(this.data, function () {
      if (this.group) {
        _this.renderGroup(this);
      }
      else {
        _this.renderOption(this);
      }
    });
    return $('.selectkit-choice', this.$container);
  };

  SelectKit.prototype.renderGroup = function (data) {
    var $ele = $('<li class="selectkit-group">' + data.label + '</li>');
    $ele.data().data = data;
    this.$list.append($ele);
  };

  SelectKit.prototype.renderOption = function (data) {
    if (data.empty) {
      this.empty_choice = data;
      if (this.settings.reset) {
        this.$display.append('<i class="selectkit-reset selectkit-reset-disabled"></i>');
      }
    }
    else {
      var $ele = $('<li class="selectkit-choice">' + data.html + '</li>');
      if (this.settings.multi && this.settings.checkbox) {
        $ele.prepend('<input type="checkbox" class="selectkit-check">');
      }
      if (data.disabled) {
        $ele.find('input').prop('disabled', true);
        $ele.addClass('selectkit-disabled');
      }
      data.$ele = $ele;
      $ele.data().data = data;
      this.$list.append($ele);
    }
  };

  SelectKit.prototype.initEvents = function () {
    var _this = this;
    $('.selectkit-display', this.$container).bind('mousedown.selectkit', function (evt) {
      _this.toggleDropdown(evt);
    });

    $('.selectkit-reset', this.$container).bind('mouseup.selectkit', function (evt) {
      _this.reset();
    });
    this.$choices.bind('mouseup.selectkit', function (evt) {
      _this.choiceMouseup(this, evt);
    });
  };

  SelectKit.prototype.toggleDropdown = function (evt) {
    evt.stopPropagation();
    if (this.open) {
      this.hide();
    }
    else {
      this.show();
    }
  };

  SelectKit.prototype.show = function () {
    this.$dropdown.show();
    this.open = true;
    this.$container.addClass('selectkit-open');
    this.$container.addClass('selectkit-active');
    $(document).bind('click.selectkit', this.clickTestAction);
  };

  SelectKit.prototype.hide = function () {
    this.$dropdown.hide();
    this.open = false;
    this.$container.removeClass('selectkit-open');
    this.$container.removeClass('selectkit-active');
    $(document).unbind('click.selectkit', this.clickTestAction);
  };

  SelectKit.prototype.choiceMouseup = function (choice, evt) {
    var $choice = $(choice);
    if (!$choice.data().data.disabled) {
      if (this.settings.multi && $choice.hasClass('selectkit-selected')) {
        this.deSelectChoice($choice.data().data, evt.target.nodeName === 'INPUT');
      }
      else {
        this.selectChoice($choice.data().data, evt.target.nodeName === 'INPUT');
      }
    }
  };

  SelectKit.prototype.selectChoice = function (choice, check) {
    if (!this.settings.multi && this.$choices.filter('.selectkit-selected').length) {
      this.deSelectChoice(this.$choices.filter('.selectkit-selected').data().data);
    }
    choice.$ele.addClass('selectkit-selected');
    choice.selected = true;
    this.$select.find('option').get(choice.options_index).selected = true;
    if (this.settings.multi && this.settings.checkbox && !check) {
      choice.$ele.find('input').prop('checked', true);
    }
    if (this.$choices.filter('.selectkit-selected').length) {
      this.$display.find('.selectkit-reset').removeClass('selectkit-reset-disabled');
    }
    if (this.settings.hideOnSelect || !this.settings.multi) {
      this.hide();
    }
    this.setText();
  };

  SelectKit.prototype.deSelectChoice = function (choice, check) {
    choice.$ele.removeClass('selectkit-selected');
    choice.selected = false;
    this.$select.find('option').get(choice.options_index).selected = false;
    if (this.settings.multi && this.settings.checkbox && !check) {
      choice.$ele.find('input').prop('checked', false);
    }
    if (!this.$choices.filter('.selectkit-selected').length) {
      this.$display.find('.selectkit-reset').addClass('selectkit-reset-disabled');
    }
    if (this.settings.hideOnSelect || !this.settings.multi) {
      this.hide();
    }
    this.setText();
  };

  SelectKit.prototype.setText = function () {
    var $selected = this.$choices.filter('.selectkit-selected');
    if ($selected.length === 1) {
      this.$text.html($selected.data().data.html);
    }
    else if ($selected.length > 1) {
      this.$text.html($selected.data().data.html + ' and ' + ($selected.length - 1) + ' others selected');
    }
    else {
      this.$text.html(this.settings.placeholder);
    }
  };

  SelectKit.prototype.reset = function () {
    this.$select.find(':selected').each(function () {
      this.selected = false;
    });
    this.$select.find('option').get(this.empty_choice.options_index).selected = true;
    this.$list.find('.selectkit-selected').removeClass('selectkit-selected');
    this.$choices.find('input').prop('checked', false);
    this.$display.find('.selectkit-reset').addClass('selectkit-reset-disabled');
    this.hide();
  };

  SelectKit.prototype.destroy = function () {
    this.$select.show();
    this.$container.before(this.$select);
    this.$container.remove();
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

  SelectKit.isBrowserSupported = function() {
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
