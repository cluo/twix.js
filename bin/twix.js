(function() {
  var Twix, extend, moment;

  if (typeof module !== "undefined") {
    moment = require('moment');
  } else {
    moment = window.moment;
  }

  if (typeof moment === "undefined") throw "Can't find moment";

  Twix = (function() {

    function Twix(start, end, allDay) {
      var endM, startM;
      startM = moment(start);
      endM = moment(end);
      this.start = startM.zone() === moment().zone ? startM : moment(startM.valueOf());
      this.end = endM.zone() === moment().zone ? endM : moment(endM.valueOf());
      this.allDay = allDay;
    }

    Twix.prototype.sameDay = function() {
      return this.start.year() === this.end.year() && this.start.month() === this.end.month() && this.start.date() === this.end.date();
    };

    Twix.prototype.sameYear = function() {
      return this.start.year() === this.end.year();
    };

    Twix.prototype.countDays = function() {
      var endDate, startDate;
      startDate = this.start.sod();
      endDate = this.end.sod();
      return endDate.diff(startDate, 'days') + 1;
    };

    Twix.prototype.daysIn = function(minHours) {
      var endDate, iter,
        _this = this;
      iter = this.start.sod();
      endDate = this.end.sod();
      return {
        next: function() {
          var val;
          if (iter > endDate || (minHours && iter.valueOf() === endDate.valueOf() && _this.end.hours() < minHours)) {
            return null;
          } else {
            val = iter.clone();
            iter.add('days', 1);
            return val;
          }
        },
        hasNext: function() {
          return iter <= endDate && (!minHours || iter.valueOf() !== endDate.valueOf() || _this.end.hours() > minHours);
        }
      };
    };

    Twix.prototype.duration = function() {
      if (this.allDay) {
        if (this.sameDay()) {
          return "all day";
        } else {
          return this.start.from(this.end.clone().add('days', 1), true);
        }
      } else {
        return this.start.from(this.end, true);
      }
    };

    Twix.prototype.past = function() {
      if (this.allDay) {
        return this.end.eod()["native"]() < moment()["native"]();
      } else {
        return this.end["native"]() < moment()["native"]();
      }
    };

    Twix.prototype.format = function(inopts) {
      var common_bucket, end_bucket, fold, format, fs, global_first, goesIntoTheMorning, needDate, options, process, start_bucket, together, _i, _len,
        _this = this;
      options = {
        groupMeridiems: true,
        spaceBeforeMeridiem: true,
        showDate: true,
        showDayOfWeek: false,
        twentyFourHour: false,
        implicitMinutes: true,
        yearFormat: "YYYY",
        monthFormat: "MMM",
        weekdayFormat: "ddd",
        dayFormat: "D",
        meridiemFormat: "A",
        hourFormat: "h",
        minuteFormat: "mm",
        allDay: "all day",
        explicitAllDay: false,
        lastNightEndsAt: 0
      };
      extend(options, inopts || {});
      fs = [];
      if (options.twentyFourHour) {
        options.hourFormat = options.hourFormat.replace("h", "H");
      }
      goesIntoTheMorning = options.lastNightEndsAt > 0 && !this.allDay && this.end.sod().valueOf() === this.start.clone().add('days', 1).sod().valueOf() && this.start.hours() > 12 && this.end.hours() < options.lastNightEndsAt;
      needDate = options.showDate || (!this.sameDay() && !goesIntoTheMorning);
      if (this.allDay && this.sameDay() && (!options.showDate || options.explicitAllDay)) {
        fs.push({
          name: "all day simple",
          fn: function() {
            return options.allDay;
          },
          slot: 0,
          pre: " "
        });
      }
      if (needDate && (this.start.year() !== moment().year() || !this.sameYear())) {
        fs.push({
          name: "year",
          fn: function(date) {
            return date.format(options.yearFormat);
          },
          pre: ", ",
          slot: 4
        });
      }
      if (!this.allDay && needDate) {
        fs.push({
          name: "all day month",
          fn: function(date) {
            return date.format("" + options.monthFormat + " " + options.dayFormat);
          },
          ignoreEnd: function() {
            return goesIntoTheMorning;
          },
          slot: 2,
          pre: " "
        });
      }
      if (this.allDay && needDate) {
        fs.push({
          name: "month",
          fn: function(date) {
            return date.format("MMM");
          },
          slot: 2,
          pre: " "
        });
      }
      if (this.allDay && needDate) {
        fs.push({
          name: "date",
          fn: function(date) {
            return date.format(options.dayFormat);
          },
          slot: 3,
          pre: " "
        });
      }
      if (needDate && options.showDayOfWeek) {
        fs.push({
          name: "day of week",
          fn: function(date) {
            return date.format(options.weekdayFormat);
          },
          pre: " ",
          slot: 1
        });
      }
      if (options.groupMeridiems && !options.twentyFourHour && !this.allDay) {
        fs.push({
          name: "meridiem",
          fn: function(t) {
            return t.format(options.meridiemFormat);
          },
          slot: 6,
          pre: options.spaceBeforeMeridiem ? " " : ""
        });
      }
      if (!this.allDay) {
        fs.push({
          name: "time",
          fn: function(date) {
            var str;
            str = date.minutes() === 0 && options.implicitMinutes && !options.twentyFourHour ? date.format(options.hourFormat) : date.format("" + options.hourFormat + ":" + options.minuteFormat);
            if (!options.groupMeridiems && !options.twentyFourHour) {
              if (options.spaceBeforeMeridiem) str += " ";
              str += date.format(options.meridiemFormat);
            }
            return str;
          },
          pre: ", ",
          slot: 5
        });
      }
      start_bucket = [];
      end_bucket = [];
      common_bucket = [];
      together = true;
      process = function(format) {
        var end_str, start_group, start_str;
        start_str = format.fn(_this.start);
        end_str = format.ignoreEnd && format.ignoreEnd() ? start_str : format.fn(_this.end);
        start_group = {
          format: format,
          value: function() {
            return start_str;
          }
        };
        if (end_str === start_str && together) {
          return common_bucket.push(start_group);
        } else {
          if (together) {
            together = false;
            common_bucket.push({
              format: {
                slot: format.slot,
                pre: ""
              },
              value: function() {
                return "" + (fold(start_bucket)) + " -" + (fold(end_bucket, true));
              }
            });
          }
          start_bucket.push(start_group);
          return end_bucket.push({
            format: format,
            value: function() {
              return end_str;
            }
          });
        }
      };
      for (_i = 0, _len = fs.length; _i < _len; _i++) {
        format = fs[_i];
        process(format);
      }
      global_first = true;
      fold = function(array, skip_pre) {
        var local_first, section, str, _j, _len2, _ref;
        local_first = true;
        str = "";
        _ref = array.sort(function(a, b) {
          return a.format.slot - b.format.slot;
        });
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          section = _ref[_j];
          if (!global_first) {
            if (local_first && skip_pre) {
              str += " ";
            } else {
              str += section.format.pre;
            }
          }
          str += section.value();
          global_first = false;
          local_first = false;
        }
        return str;
      };
      return fold(common_bucket);
    };

    return Twix;

  })();

  extend = function(first, second) {
    var attr, _results;
    _results = [];
    for (attr in second) {
      if (typeof second[attr] !== "undefined") {
        _results.push(first[attr] = second[attr]);
      } else {
        _results.push(void 0);
      }
    }
    return _results;
  };

  if (typeof module !== "undefined") {
    module.exports = Twix;
  } else {
    window.Twix = Twix;
  }

}).call(this);
