/* eslint-disable complexity */


// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Main class for inlineannotation content type
 *
 * @module     local_ivinlineannotation/main
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
import $ from 'jquery';
import Base from 'mod_interactivevideo/type/base';
import ModalForm from 'core_form/modalform';
import Templates from 'core/templates';
import Notification from 'core/notification';
import {notifyFilterContentUpdated as notifyFilter} from 'core_filters/events';
export default class InlineAnnotation extends Base {
    /**
     * Callback function to be executed after an edit operation.
     * Currently, this function does not perform any actions.
     */
    postEditCallback() {
        // Do nothing
    }

    /**
     * Round a number to two decimal places
     * @param {Number} num Number
     * @returns {Number} rounded number
     */
    roundToTwo(num) {
        return +(Math.round(num + 'e+2') + 'e-2');
    }

    /**
     * Render the container for the annotation.
     * @param {Object} annotation The annotation object.
     * @return {void}
     */
    renderContainer(annotation) {
        const videoWrapper = $('#video-wrapper');
        videoWrapper.find('#canvas').remove();
        videoWrapper.append(`<div id="canvas" data-id="${annotation.id}"
             class="message text-white bg-transparent inlineannotation position-absolute" tabindex="0"></div>`);

        const updateAspectRatio = async(video, reset) => {
            let elem = video ? $('#player') : $(`#canvas[data-id='${annotation.id}']`);
            if ($("#wrapper").hasClass('fullscreen')) {
                let ratio = 16 / 9;
                if (!this.displayoptions.usefixedratio || this.displayoptions.usefixedratio == 0) {
                    ratio = this.player.aspectratio;
                }
                let videowrapperaspect = videoWrapper.width() / videoWrapper.height();
                const videowrapperwidth = videoWrapper.width();
                const videowrapperheight = videoWrapper.height();
                // Screen is wider than the video.
                if (videowrapperaspect > ratio) {
                    let height = videowrapperheight;
                    let width = height * ratio;
                    elem.css('height', height + 'px');
                    elem.css('width', width + 'px');
                    elem.css('top', '0');
                    elem.css('left', (videowrapperwidth - width) / 2 + 'px');
                } else if (videowrapperaspect < ratio) {
                    let width = videowrapperwidth;
                    let height = width / ratio;
                    elem.css('width', width + 'px');
                    elem.css('height', height + 'px');
                    elem.css('top', ((videowrapperheight - height) / 2) + 'px');
                    elem.css('left', '0');
                }
            } else {
                elem.css('width', '100%');
                elem.css('height', '100%');
                elem.css('top', '0');
                elem.css('left', '0');
            }
            if (reset) {
                elem.css('width', '100%');
                elem.css('height', '100%');
                elem.css('top', '0');
                elem.css('left', '0');
            }
        };

        updateAspectRatio();
        updateAspectRatio(true);

        let vwrapper = document.querySelector('#video-wrapper');
        let resizeTimeout;
        let resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
            updateAspectRatio();
            updateAspectRatio(true);
            }, 100);
        });

        resizeObserver.observe(vwrapper);

        $(document).on('timeupdate', function() {
            updateAspectRatio(true, true);
        });
    }

    /**
     * Util function to input the timestamp on the modal form.
     * @param {Object} options The options
     * @returns {void}
     * */
    timepicker(options) {
        // Normalize the options.
        options = options || {};
        options.modal = options.modal || true;
        options.disablelist = options.disablelist || false;
        options.required = options.required || false;
        let self = this;
        $(document).off('click', '#confirmtime');
        // Pick a time button.
        $(document).off('click', `.pickatime button`).on('click', `.pickatime button`, async function(e) {
            e.preventDefault();
            const $this = $(this);
            const currenttime = await self.player.getCurrentTime();
            const field = $(this).data('field');
            const fieldval = $(`[name=${field}]`).val();
            if (fieldval) {
                const parts = fieldval.split(':');
                const time = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                await self.player.seek(time); // Go to the time.
            }
            // Hide this modal.
            if (options.modal) {
                $this.closest('.modal').addClass('d-none');
                $('.modal-backdrop').addClass('d-none');
            }
            if (options.disablelist) {
                $('#annotationwrapper').addClass('no-pointer-events');
            }
            $('#timeline-btns .col:first-child').hide().before(`<div class="col confirmtime-wrapper
                    d-flex justify-content-start align-items-center
                         "><button class="btn btn-circle pulse btn-primary" id="confirmtime"
                         title="${M.util.get_string('confirmtime', 'ivplugin_contentbank')}">
                         <i class="fa fa-check"></i></button></div>`);
            $('#timeline-wrapper').removeClass('no-pointer-events');
            // Hide the annotation-wrapper.
            $('#canvas .annotation-wrapper').css('visibility', 'hidden');

            $(document).on('click', '#confirmtime', async function(e) {
                e.preventDefault();
                // Show the modal.
                if (options.modal) {
                    $this.closest('.modal').removeClass('d-none');
                    $('.modal-backdrop').removeClass('d-none');
                }
                if (options.disablelist) {
                    $('#annotationwrapper').removeClass('no-pointer-events');
                }
                // Remove the button.
                // Put the time in the input.
                const time = await self.player.getCurrentTime();
                const formattedTime = self.convertSecondsToHMS(time, false, true);
                $(`[name=${field}]`).val(formattedTime);
                $(this).closest('div').remove();
                $('#timeline-btns .col:first-child').show();
                // Go back to the current time.
                self.player.seek(currenttime);
                $('#timeline-wrapper').addClass('no-pointer-events');
                self.player.pause();
                $('#canvas .annotation-wrapper').css('visibility', 'visible');
            });
        });

        // Reset time button.
        $(document).off('click', `.resettime button`).on('click', `.resettime button`, function(e) {
            e.preventDefault();
            const field = $(this).data('field');
            $(`[name=${field}]`).val('');
            if (options.required) {
                $(`[name=${field}]`).val(self.convertSecondsToHMS(self.start, false, true));
            }
        });

    }

    /**
     * Post-processes the content after rendering an annotation.
     * @param {Object} annotation The annotation object.
     * @param {Object} data The data object.
     * @return {void}
     */
    postContentRender(annotation, data) {
        let self = this;
        let $videoWrapper = $('#video-wrapper');
        let $playerWrapper = $('#wrapper');
        let $canvas = $('#canvas');
        let draftStatus = null;
        let seeking = false;
        /**
         * Format seconds to HH:MM:SS
         * @param {Number} seconds seconds
         * @returns formatted time
         */
        const convertSecondsToMMSS = (seconds) => {
            let minutes = Math.floor(seconds / 60);
            seconds = Math.round(seconds - minutes * 60);
            return (minutes < 10 ? '0' + minutes : minutes) + ':' + (seconds < 10 ? '0' + seconds : seconds);
        };

        /**
         * Update position information of the active element on the toolbar.
         * @param {Object} elem jQuery element
         */
        const updatePositionInfo = (elem) => {
            let w = elem.outerWidth();
            let hw = elem.outerHeight();
            let t = elem.position().top < 0 ? 0 : elem.position().top;
            let l = elem.position().left < 0 ? 0 : elem.position().left;
            let z = elem.css('z-index');
            $(`#inlineannotation-btns #position`)
                .text(`x: ${Math.round(l)}, y: ${Math.round(t)}, z: ${z - 5}, w: ${Math.round(w)}, h: ${Math.round(hw)}`);
        };

        /**
         * Recalculate the size of the element.
         * @param {Object} elem jQuery element
         * @return {Object} position of the element
         */
        const recalculatingSize = (elem) => {
            let message = $videoWrapper.find(`#canvas`);
            $(`#inlineannotation-btns #down, #inlineannotation-btns #up`).removeAttr('disabled');
            let w = self.roundToTwo(elem.outerWidth()) / message.width() * 100;
            let h = self.roundToTwo(elem.outerHeight()) / message.height() * 100;
            let t = self.roundToTwo(elem.position().top) / message.height() * 100;
            t = t < 0 ? 0 : t;
            let l = self.roundToTwo(elem.position().left) / message.width() * 100;
            l = l < 0 ? 0 : l;
            let z = elem.css('z-index');
            let g = elem.data('group');
            let position = {
                'width': w + '%',
                'height': h + '%',
                'left': l + '%',
                'top': t + '%',
                'z-index': z,
            };
            position.group = g;
            elem.css(position);
            updatePositionInfo(elem);
            return position;
        };

        /**
         * Calculate the text size for text and file type.
         * @param {Object} elem jQuery element
         * @param {Boolean} button if it is a button
         * @param {Boolean} multiline if it is a multiline text
         */
        const recalculatingTextSize = (elem, button, multiline = false) => {
            let fontSize = elem.outerHeight();
            let padding = 0;
            let rowCount = 1;
            if (multiline) {
                let rows = elem.find('.text-row');
                rowCount = rows.length;
                if (rowCount > 1) {
                    let rowHeight = elem.outerHeight() / rowCount;
                    padding = rowHeight * 0.3;
                    fontSize = (elem.outerHeight() - padding * 2) / rowCount;
                }
            }
            let style = {
                'font-size': (button ? fontSize * 0.7 : fontSize * 0.9) + 'px',
                'line-height': fontSize + 'px',
                'padding-left': (button ? fontSize * 0.5 : fontSize * 0.3) + 'px',
                'padding-right': (button ? fontSize * 0.5 : fontSize * 0.3) + 'px',
            };
            if (multiline && rowCount > 1) {
                style.padding = padding + 'px';
            }
            elem.find('.annotation-content').css(style);
            elem.css('width', 'auto');
        };

        const renderImage = (wrapper, item, prop, id, position) => {
            const parts = prop.timestamp.split(':');
            const timestamp = parts.length > 0 ? Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]) : -1;
            if (prop.gotourl != '') {
                wrapper.append(`<a href="${prop.gotourl}" target="_blank"><img src="${prop.url}" id="${id}"
                             class="annotation-content w-100 ${prop.shadow == '1' ? 'shadow' : ''}"
                             ${prop.rounded == 1 ? 'style="border-radius:1em;"' : ''} alt="${prop.formattedalttext}"/></a>`);
            } else {
                wrapper.append(`<img src="${prop.url}" id="${id}"
                                  class="annotation-content w-100 ${prop.shadow == '1' ? 'shadow' : ''}
                                  ${timestamp >= 0 ? 'cursor-pointer' : ''}"
                                   ${prop.rounded == 1 ? 'style="border-radius:1em;"' : ''} alt="${prop.formattedalttext}"/>`);
            }
            if (!self.isEditMode()) {
                if (prop.gotourl == '' && timestamp < 0) {
                    wrapper.removeClass('resizable');
                    wrapper.addClass('no-pointer');
                } else {
                    wrapper.addClass('clickable');
                    if (timestamp >= 0) {
                        wrapper.attr('data-timestamp', timestamp);
                    }
                }
            }
            wrapper.css(position);
            wrapper.css('height', 'auto');
            $canvas.append(wrapper);
        };

        const renderVideo = (wrapper, item, prop, id, position) => {
            wrapper.append(`<video id="${id}" class="annotation-content w-100 ${prop.shadow == '1' ? 'shadow' : ''}"
                 ${prop.showcontrol == 1 && !self.isEditMode() ? 'controls' : ''}
                  ${$('body').hasClass('mobiletheme') ? 'preload="auto"' : ''}
                 src="${prop.url}" style="border-radius: ${prop.rounded == 1 ? '1em' : '0'}" disablePictureInPicture/></video>
             <i class="playpause bi bi-play-fill position-absolute" style="font-size: 2em; line-height:: 2em;"></i>`);
            let video = wrapper.find('video')[0];
            video.autoplay = prop.autoplay == '1';
            video.playsInline = true;
            if (self.isEditMode()) {
                video.autoplay = false;
            }
            video.onplay = function() {
                wrapper.find('.playpause').removeClass('bi-play-fill').addClass('bi-pause-fill');
            };
            video.onpause = function() {
                wrapper.find('.playpause').removeClass('bi-pause-fill').addClass('bi-play-fill');
            };
            video.onended = function() {
                wrapper.find('.playpause').removeClass('bi-pause-fill').addClass('bi-play-fill');
            };
            wrapper.css(position);
            $canvas.append(wrapper);
            recalculatingSize(wrapper);
        };

        const renderFile = (wrapper, item, prop, id, position) => {
            const type = item.type;
            let wrapperhtml = ``;
            if (type == 'audio') {
                wrapperhtml = `<span id="${id}" tabindex="0"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'iv-rounded-0'}
                              annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatex-360"
                               data-src="${prop.url}"><i class="bi bi-volume-up fs-unset" style="margin-right:0.25em;"></i>
                               <span class="timeremaining">00:00</span></span>`;
            } else if (type == 'file') {
                wrapperhtml = `<a id="${id}"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'iv-rounded-0'}
                             annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatey-180" href="${prop.url}"
                              target="_blank"><i class="bi bi-paperclip fs-unset"></i>${prop.formattedlabel != "" ?
                        `<span style="margin-left:0.25em;">${prop.formattedlabel}` : ''}</a>`;
            }
            wrapper.append(`<div class="d-flex h-100">${wrapperhtml}</div>`);

            if (type == 'audio' && !self.isEditMode()) {
                let playButton = wrapper.find('.annotation-content');
                let audioSrc = prop.url;
                let media = new Audio(audioSrc);
                playButton.off('click').on('click', function(e) {
                    e.stopImmediatePropagation();
                    if (media.paused || media.ended || media.currentTime === 0) {
                        media.play();
                        $(this).find('i').removeClass('bi-volume-up').addClass('bi-pause-fill');
                    } else {
                        media.pause();
                        $(this).find('i').removeClass('bi-pause-fill').addClass('bi-volume-up');
                    }
                });

                let totaltime = 0;
                media.onloadedmetadata = function() {
                    totaltime = media.duration;
                    playButton.find('span.timeremaining').text(convertSecondsToMMSS(totaltime));
                };

                media.onended = function() {
                    playButton.find('i').removeClass('bi-pause-fill').addClass('bi-volume-up');
                    playButton.find('span.timeremaining').text(convertSecondsToMMSS(totaltime));
                };

                media.ontimeupdate = function() {
                    playButton.find('span.timeremaining')
                        .text(convertSecondsToMMSS(media.duration - media.currentTime));
                };

                if (prop.autoplay == '1') {
                    setTimeout(() => {
                        playButton.trigger('click');
                    }, 100);
                }

                $(document).one('iv:playerSeek iv:playerPlay', function() {
                    if (media) {
                        media.pause();
                    }
                });
            }

            position.width = 0;

            wrapper.css(position);
            $canvas.append(wrapper);
            recalculatingTextSize(wrapper, true);
        };

        const renderNavigation = (wrapper, item, prop, id, position) => {
            const parts = prop.timestamp.split(':');
            const timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);

            wrapper.append(`<div class="d-flex h-100"><span id="${id}" tabindex="0" class="btn ${prop.style} ${prop.rounded == '1' ?
                'btn-rounded' : 'iv-rounded-0'} annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''}">
                ${prop.formattedlabel}</span></div>`);

            position.width = 0;
            wrapper.attr('data-timestamp', timestamp);
            wrapper.css(position);
            $canvas.append(wrapper);
            recalculatingTextSize(wrapper, true);
        };

        const renderStopwatch = (wrapper, item, prop, id, position) => {
            const duration = Number(prop.duration) * 60;
            wrapper.append(`<div class="d-flex h-100"><span id="${id}" tabindex="0"
                             class="btn ${prop.style} ${prop.rounded == '1' ? 'btn-rounded' : 'iv-rounded-0'}
                              annotation-content text-nowrap ${prop.shadow == '1' ? 'shadow' : ''} rotatey-180"
                               data-duration="${duration}">
                               <i class="bi bi bi-stopwatch fs-unset" style="margin-right:0.25em;"></i>
                               <span>${convertSecondsToMMSS(duration)}</span></span></div>`);

            let timer, alarm;
            if (timer) {
                clearInterval(timer);
            }
            const intervalfunction = function() {
                timer = setInterval(() => {
                    $(`.annotation-content#${id}`).addClass('running');
                    let time = $(`.annotation-content#${id}`).data('duration');
                    time--;
                    $(`.annotation-content#${id} span`).text(convertSecondsToMMSS(time));
                    $(`.annotation-content#${id}`).data('duration', time);
                    if (prop.playalarmsound.playsoundatinterval == '1'
                        && time % (prop.playalarmsound.intervaltime * 60) == 0) {
                        if (prop.playalarmsound.playsoundatend == 1) {
                            alarm = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/short-alarm.mp3');
                            alarm.play();
                        }
                    }
                    if (time < 0) {
                        clearInterval(timer);
                        if (prop.playalarmsound.playsoundatend == 1) {
                            alarm = new Audio(M.cfg.wwwroot + '/mod/interactivevideo/sounds/alarm.mp3');
                            alarm.play();
                            alarm.onplay = function() {
                                $(`.annotation-content#${id}`).addClass('pulse');
                            };
                            alarm.onended = function() {
                                $(`.annotation-content#${id}`).removeClass('pulse');
                            };
                        }
                        $(`.annotation-content#${id}`).removeClass('running');
                        $(`.annotation-content#${id} span`).text(convertSecondsToMMSS(duration));
                        $(`.annotation-content#${id}`).data('duration', duration);
                    }
                }, 1000);
            };

            if (!self.isEditMode()) {
                intervalfunction();
                $videoWrapper.off('click', `.annotation-content#${id}`).on('click', `.annotation-content#${id}`, function(e) {
                    e.stopImmediatePropagation();
                    if (prop.allowpause == 1) {
                        if ($(this).hasClass('running')) {
                            clearInterval(timer);
                            if (alarm) {
                                alarm.pause();
                            }
                            $(this).removeClass('running');
                        } else {
                            intervalfunction();
                        }
                    } else if ($(this).data('duration') == duration) {
                        intervalfunction();
                    }
                });
            }

            $(document).one('iv:playerSeek', function() {
                clearInterval(timer);
            });

            position.width = 0;

            wrapper.css(position);
            $canvas.append(wrapper);
            recalculatingTextSize(wrapper, true);
        };

        const renderTextblock = (wrapper, item, prop, id, position) => {
            const parts = prop.timestamp.split(':');
            const timestamp = parts.length > 0 ? Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]) : -1;
            const textparts = prop.formattedlabel.split('\r\n');
            let textblock = '<div class="d-flex flex-column">';
            textparts.forEach((part) => {
                if (part.trim() == '') {
                    return;
                }
                textblock += `<span class="text-row text-nowrap iv-text-${prop.alignment}"
                                 style='font-family: ${prop.textfont != '' ? prop.textfont : 'inherit'}'>${part}</span>`;
            });
            textblock += '</div>';
            if (prop.url != undefined && prop.url != '') {
                wrapper.append(`<a id="${id}"
                                     class="annotation-content d-block ${prop.shadow == '1' ? 'text-shadow' : ''}"
                                      href="${prop.url}" target="_blank">${textblock}</a>`);
                wrapper.addClass('clickable');
            } else {
                wrapper.append(`<div id="${id}"
                                     class="annotation-content ${prop.shadow == '1' ? 'text-shadow' : ''}
                                     ">${textblock}</div>`);
            }
            wrapper.position.width = 0;
            wrapper.css(position);
            const style = {
                'font-size': item.position.fontSize,
                'line-height': item.position.lineHeight,
                'font-weight': prop.bold == '1' ? 'bold' : 'normal',
                'font-style': prop.italic == '1' ? 'italic' : 'normal',
                'text-decoration': prop.underline == '1' ? 'underline' : 'none',
                'color': prop.textcolor,
                'background': prop.bgcolor,
                'border-radius': prop.rounded == '1' ? '0.3em' : '0',
                'border-width': prop.borderwidth,
                'border-color': prop.bordercolor,
                'border-style': 'solid',
            };
            if (timestamp >= 0) {
                wrapper.attr('data-timestamp', timestamp);
                wrapper.addClass('clickable');
            }
            wrapper.find('.annotation-content').css(style);
            $canvas.append(wrapper);
            recalculatingTextSize(wrapper, false, true);
        };

        const renderShape = (wrapper, item, prop, id, position) => {
            const parts = prop.timestamp.split(':');
            const timestamp = parts.length > 0 ? (Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2])) : -1;
            if (prop.gotourl != '') {
                wrapper.append(`<a href="${prop.gotourl}" target="_blank"><div id="${id}"
                             class="annotation-content ${prop.shadow == '1' ? 'shadow' : ''}"
                              style="width: 100%; height: 100%;"></div></a>`);
                wrapper.addClass('clickable');
            } else {
                if (!self.isEditMode()) {
                    if (timestamp >= 0) {
                        wrapper.addClass('clickable');
                    } else {
                        wrapper.addClass('no-pointer');
                    }
                }
                wrapper.append(`<div id="${id}" class="annotation-content ${prop.shadow == '1' ? 'shadow' : ''}
                                 ${timestamp > 0 ? 'cursor-pointer' : ''}"
                             style="width: 100%; height: 100%;"></div>`);
            }
            if (timestamp >= 0) {
                wrapper.attr('data-timestamp', timestamp);
            }
            wrapper.css(position);
            const style = {
                'background': prop.bgcolor,
                'border-width': prop.borderwidth,
                'border-color': prop.bordercolor,
                'border-style': 'solid',
                'opacity': prop.opacity / 100,
            };
            if (prop.shape == 'circle') {
                style['border-radius'] = '50%';
            } else if (prop.shape == 'rectangle') {
                style['border-radius'] = prop.rounded == '1' ? '1em' : '0';
            }
            wrapper.find('.annotation-content').css(style);
            $canvas.append(wrapper);
        };

        const renderHotspot = (wrapper, item, prop, id, position) => {
            wrapper.append(`<div id="${id}" class="annotation-content shadow-sm pulse" role="button"
                 title="${prop.formattedtitle}"></div>`);
            position['aspect-ratio'] = '1';
            wrapper.css(position);
            const style = {
                'background-color': prop.color,
                'opacity': prop.opacity / 100,
                'border-radius': '50%',
                'aspect-ratio': '1',
            };
            wrapper.find('.annotation-content').css(style);
            $canvas.append(wrapper);

            if (!self.isEditMode()) {
                if (prop.usemodal == '1') {
                    if (self.isBS5) {
                        wrapper.attr({
                            'data-bs-toggle': 'modal',
                        });
                    } else {
                        wrapper.attr({
                            'data-toggle': 'modal',
                        });
                    }
                } else {
                    let attr = {
                        'tabindex': -1,
                    };
                    if (self.isBS5) {
                        attr['data-bs-trigger'] = 'manual';
                        attr['data-bs-boundary'] = 'viewport';
                        attr['data-bs-placement'] = 'auto';
                        attr['data-bs-html'] = 'true';
                        attr['data-bs-content'] = '<div class="loader"></div>';
                        attr['data-bs-title'] = prop.formattedtitle
                            + `<i class="bi bi-x-circle-fill iv-ml-auto popover-dismiss cursor-pointer"
                                     style="font-size:1.5em;"></i>`;
                    } else {
                        attr['data-trigger'] = 'manual';
                        attr['data-boundary'] = 'viewport';
                        attr['data-placement'] = 'auto';
                        attr['data-html'] = 'true';
                        attr['data-content'] = '<div class="loader"></div>';
                        attr['data-title'] = prop.formattedtitle
                            + `<i class="bi bi-x-circle-fill iv-ml-auto popover-dismiss cursor-pointer"
                                     style="font-size:1.5em;"></i>`;
                    }

                    wrapper.attr(attr);

                    wrapper.popover({
                        container: '#wrapper',
                        html: true,
                        template: `<div class="popover inlineannotation-popover id-${id}"
                                     role="tooltip"><div class="arrow"></div>
                                     <h3 class="popover-header d-flex justify-content-between"></h3>
                                     <div class="popover-body rounded"></div>${prop.url != '' ?
                                `<div class="popup-footer bg-light p-2 rounded-bottom"><a href="${prop.url}"
                                          class="d-block w-100 text-right rotatex-360" target="_blank">
                                          <i class="bi bi-arrow-right"><i></i></i></a></div>` : ''}</div>`,
                    });

                    wrapper.on('shown.bs.popover', async function() {
                        let $body = $(`.popover.id-${id} .popover-body`);
                        const html = await self.formatContent(prop.content.text, annotation.contextid);
                        $body.html(html);
                        notifyFilter($body);
                        wrapper.popover('update');
                    });
                    if (prop.openbydefault == '1') {
                        wrapper.popover('show');
                    }
                }
            }
        };

        const renderItems = (elements, actives, update) => {
            if (!update) { // Clear the canvas if it is a new start.
                $canvas.empty();
            }

            if (elements.length == 0) {
                if (actives) {
                    actives.forEach((active) => {
                        $canvas.find(`.annotation-wrapper[data-item="${active}"]`).addClass('active');
                    });
                }
            } else {
                let count = 0;
                elements.forEach((item) => {
                    let prop = item.properties;
                    let type = item.type;
                    let id = item.id;
                    let position = item.position;
                    if (!self.isEditMode()) {
                        const left = position.left.replace('%', '');
                        const top = position.top.replace('%', '');
                        const width = position.width.replace('%', '');
                        const height = position.height ? position.height.replace('%', '') : 0;
                        if (left < 0.01) {
                            position.left = '0%';
                        }
                        if (top < 0.01) {
                            position.top = '0%';
                        }
                        if (width > 99.5) {
                            position.width = '100%';
                        }
                        if (height > 99.5) {
                            position.height = '100%';
                        }
                    }
                    let wrapper = $(`<div class="annotation-wrapper" data-group="${position.group}" data-anno="${annotation.id}"
                     data-item="${id}" data-type="${type}"></div>`);
                    if (prop.resizable == '1' || self.isEditMode()) {
                        wrapper.addClass('resizable');
                        wrapper.attr('tabindex', 0);
                    }

                    switch (type) {
                        case 'image':
                            renderImage(wrapper, item, prop, id, position);
                            break;
                        case 'video':
                            renderVideo(wrapper, item, prop, id, position);
                            break;
                        case 'file':
                        case 'audio':
                            renderFile(wrapper, item, prop, id, position);
                            break;
                        case 'navigation':
                            renderNavigation(wrapper, item, prop, id, position);
                            break;
                        case 'stopwatch':
                            renderStopwatch(wrapper, item, prop, id, position);
                            break;
                        case 'textblock':
                            renderTextblock(wrapper, item, prop, id, position);
                            break;
                        case 'shape':
                            renderShape(wrapper, item, prop, id, position);
                            break;
                        case 'hotspot':
                            renderHotspot(wrapper, item, prop, id, position);
                            break;
                    }

                    count++;
                    if (count == elements.length) {
                        $canvas.find('.annotation-wrapper.resizable').draggable({
                            containment: "#canvas",
                            cursor: "move",
                            grid: [1, 1],
                            handle: '.annotation-content',
                            start: function() {
                                // Get all the selected elements
                                if (!$(this).hasClass('active')) {
                                    $(this).trigger('click');
                                }
                                let $selected = $canvas.find('.annotation-wrapper.active');
                                $selected.each(function() {
                                    $(this).data('startPosition', $(this).position());
                                });
                            },
                            drag: function(event, ui) {
                                let $selected = $canvas.find('.annotation-wrapper.active');
                                let left = ui.originalPosition.left - ui.position.left;
                                let top = ui.originalPosition.top - ui.position.top;
                                let positions = $selected.map(function() {
                                    return {
                                        id: $(this).data('item'),
                                        left: $(this).position().left,
                                        top: $(this).position().top,
                                        bottom: $(this).position().top + $(this).height(),
                                        right: $(this).position().left + $(this).width(),
                                    };
                                }).get();

                                if (positions.find(x => x.left < 0)) {
                                    // Sort the elements by left position to get the leftmost element
                                    positions.sort((a, b) => a.left - b.left);
                                    let onLeft = positions.find(x => x.left < 0);
                                    let id = onLeft.id;
                                    let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                    target.css('left', 0);
                                    let distance = target.data('startPosition').left;
                                    ui.position.left = ui.originalPosition.left - distance;
                                    left = ui.originalPosition.left - ui.position.left;
                                }

                                if (positions.find(x => x.top < 0)) {
                                    positions.sort((a, b) => a.top - b.top);
                                    let onTop = positions.find(x => x.top < 0);
                                    let id = onTop.id;
                                    let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                    target.css('top', 0);
                                    let distance = target.data('startPosition').top;
                                    ui.position.top = ui.originalPosition.top - distance;
                                    top = ui.originalPosition.top - ui.position.top;
                                }

                                let canvasWidth = $canvas.width();
                                let canvasHeight = $canvas.height();
                                if (positions.find(x => x.right > canvasWidth)) {
                                    positions.sort((a, b) => a.right - b.right);
                                    let onRight = positions.find(x => x.right > $canvas.width());
                                    let id = onRight.id;
                                    let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                    target.css('left', (canvasWidth - target.width() - 1) + 'px');
                                    let distance = target.data('startPosition').left - target.position().left;
                                    ui.position.left = ui.originalPosition.left - distance;
                                    left = ui.originalPosition.left - ui.position.left;
                                }

                                if (positions.find(x => x.bottom > canvasHeight)) {
                                    positions.sort((a, b) => a.bottom - b.bottom);
                                    let onBottom = positions.find(x => x.bottom > canvasHeight);
                                    let id = onBottom.id;
                                    let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                    target.css('top', (canvasHeight - target.height() - 1) + 'px');
                                    let distance = target.data('startPosition').top - target.position().top;
                                    ui.position.top = ui.originalPosition.top - distance;
                                    top = ui.originalPosition.top - ui.position.top;
                                }

                                $selected.not(this).each(function() {
                                    let $this = $(this);
                                    const position = $this.data('startPosition');
                                    $this.css({
                                        left: (position.left - left) + 'px',
                                        top: (position.top - top) + 'px',
                                    });
                                });
                                updatePositionInfo($(this));
                            },
                            stop: function() {
                                if (self.isEditMode()) {
                                    let $selected = $canvas.find('.annotation-wrapper.active');
                                    let positions = $selected.map(function() {
                                        let thisPosition = $(this).position();
                                        return {
                                            id: $(this).data('item'),
                                            left: thisPosition.left,
                                            top: thisPosition.top,
                                            bottom: thisPosition.top + $(this).height(),
                                            right: thisPosition.left + $(this).width(),
                                        };
                                    }).get();

                                    if (positions.find(x => x.left < 0)) {
                                        positions.sort((a, b) => a.left - b.left);
                                        let onLeft = positions.find(x => x.left < 0);
                                        let id = onLeft.id;
                                        let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                        target.css('left', 0);
                                        let distance = target.data('startPosition').left;
                                        $selected.each(function() {
                                            let $this = $(this);
                                            let position = $this.data('startPosition');
                                            let newLeft = position.left - distance;
                                            $this.css('left', newLeft + 'px');
                                        });
                                    }

                                    if (positions.find(x => x.top < 0)) {
                                        positions.sort((a, b) => a.top - b.top);
                                        let onTop = positions.find(x => x.top < 0);
                                        let id = onTop.id;
                                        let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                        target.css('top', 0);
                                        let distance = target.data('startPosition').top;
                                        $selected.each(function() {
                                            let $this = $(this);
                                            let position = $this.data('startPosition');
                                            let newTop = position.top - distance;
                                            $this.css('top', newTop + 'px');
                                        });
                                    }

                                    let canvasWidth = $canvas.width();
                                    let canvasHeight = $canvas.height();
                                    if (positions.find(x => x.right > canvasWidth)) {
                                        positions.sort((a, b) => a.right - b.right);
                                        let onRight = positions.find(x => x.right > canvasWidth);
                                        let id = onRight.id;
                                        let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                        target.css('left', (canvasWidth - target.width() - 1) + 'px');
                                        let distance = target.data('startPosition').left - target.position().left;
                                        $selected.each(function() {
                                            let $this = $(this);
                                            let position = $this.data('startPosition');
                                            let newLeft = position.left - distance;
                                            $this.css('left', newLeft + 'px');
                                        });
                                    }

                                    if (positions.find(x => x.bottom > canvasHeight)) {
                                        positions.sort((a, b) => a.bottom - b.bottom);
                                        let onBottom = positions.find(x => x.bottom > canvasHeight);
                                        let id = onBottom.id;
                                        let target = $canvas.find(`.annotation-wrapper[data-item="${id}"]`);
                                        target.css('top', (canvasHeight - target.height() - 1) + 'px');
                                        let distance = target.data('startPosition').top - target.position().top;
                                        $selected.each(function() {
                                            let $this = $(this);
                                            let position = $this.data('startPosition');
                                            let newTop = position.top - distance;
                                            $this.css('top', newTop + 'px');
                                        });
                                    }

                                    getItems(false);
                                    updatePositionInfo($(this));
                                    $selected = $selected.map(function() {
                                        return $(this).data('item');
                                    }).get();

                                    saveTracking($selected);
                                }
                            }
                        });

                        $canvas.find('.annotation-wrapper.resizable').resizable({
                            containment: "#canvas",
                            handles: "all",
                            grid: [1, 1],
                            minHeight: 1,
                            minWidth: 1,
                            resize: function(event) {
                                if (self.isEditMode()) {
                                    let type = $(this).data('type');
                                    if (type == 'file' || type == 'audio' || type == 'stopwatch' || type == 'navigation'
                                        || type == 'textblock') {
                                        recalculatingTextSize($(this), type != 'textblock', type == 'textblock');
                                    } else if (type == 'shape' && event.ctrlKey) {
                                        $(this).resizable('option', 'aspectRatio', 1);
                                    }
                                    updatePositionInfo($(this));
                                }
                            },
                            stop: function() {
                                if (self.isEditMode()) {
                                    let type = $(this).data('type');
                                    if (type == 'file' || type == 'navigation' || type == 'textblock') {
                                        recalculatingTextSize($(this), type != 'textblock', type == 'textblock');
                                    } else if (type == 'shape') {
                                        $(this).resizable('option', 'aspectRatio', false);
                                    }
                                    recalculatingSize($(this));
                                    getItems(false);
                                    saveTracking([$(this).data('item')]);
                                    $(this).trigger('click');
                                }
                            }
                        });
                    }

                    if (type != 'shape') {
                        wrapper.on('mouseover', function() {
                            if (!$(this).hasClass('resizable')) {
                                return;
                            }

                            let aspectRatio =
                                $(this).find('.annotation-content').width() / $(this).find('.annotation-content').height();
                            if (wrapper.width() / wrapper.height() != aspectRatio && (type == 'image' || type == 'video')) {
                                $(this).height((wrapper.width() / aspectRatio));
                            }
                            try {
                                $(this).resizable('option', 'aspectRatio', $(this).find('.annotation-content').outerWidth() /
                                    $(this).find('.annotation-content').outerHeight());
                            } catch (e) {
                                // Do nothing.
                            }

                        });
                    }

                    if (actives && actives.includes(id)) {
                        wrapper.addClass('active');
                        if (actives.length == 1) {
                            setTimeout(function() {
                                wrapper.trigger('mouseover');
                                wrapper.trigger('click');
                            }, 500);
                        }
                    }

                });

                // Handle behavior for each item
                if (!self.isEditMode()) {
                    $videoWrapper.off('click', `#canvas .annotation-wrapper`).on('click', `#canvas .annotation-wrapper`,
                        function(e) {
                            e.stopImmediatePropagation();
                            let wrapper = $(this);
                            let type = wrapper.data('type');
                            switch (type) {
                                case 'video':
                                    var video = wrapper.find('video')[0];
                                    if (video.paused || video.ended || video.currentTime === 0) {
                                        video.play();
                                    } else {
                                        video.pause();
                                    }
                                    break;
                                case 'hotspot':
                                    var viewertype = wrapper.data('toggle') || wrapper.data('bs-toggle');
                                    var hotspotid = wrapper.data('item');
                                    var hotspot = items.find(x => x.id == hotspotid);
                                    if (viewertype == 'modal') {
                                        let title = hotspot.properties.formattedtitle;
                                        let content = hotspot.properties.content.text;
                                        let url = hotspot.properties.url;
                                        let modal = `<div class="modal fade" id="annotation-modal" role="dialog"
                                         aria-labelledby="annotation-modal"
                                         aria-hidden="true" data${self.isBS5 ? '-bs' : ''}-backdrop="static"
                                          data${self.isBS5 ? '-bs' : ''}-keyboard="false">
                             <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                                <div class="modal-content iv-rounded-lg">
                                    <div class="modal-header d-flex align-items-center shadow-sm iv-iv-pr-0" id="title">
                                        <h5 class="modal-title text-truncate mb-0">${title}</h5>
                                        <button class="btn mx-2 p-0 close" aria-label="Close"
                                         data${self.isBS5 ? '-bs' : ''}-dismiss="modal">
                                            <i class="bi bi-x-lg fa-fw" style="font-size: x-large;"></i>
                                        </button>
                                    </div>
                                    <div class="modal-body" id="content">
                                    <div class="loader"></div>
                                    </div>
                                    ${url != '' ? `<div class="modal-footer bg-light p-2 rounded-bottom">
                                        <a href="${url}" class="d-block w-100 text-right rotatex-360" target="_blank">
                                        <i class="bi bi-arrow-right"><i></i></i></a></div>` : ''}
                                    </div>
                                </div>
                                </div>`;
                                        $('#wrapper').append(modal);
                                        $('#annotation-modal').modal('show');
                                        $('#annotation-modal').on('hide.bs.modal', function() {
                                            $('#annotation-modal').remove();
                                        });
                                        $('#annotation-modal').on('shown.bs.modal', async function() {
                                            $('#annotation-modal .modal-body').fadeIn(300);
                                            let $body = $('#annotation-modal .modal-body');
                                            const html = await self.formatContent(content, annotation.contextid);
                                            $body.html(html);
                                            notifyFilter($body);
                                        });
                                    } else {
                                        wrapper.popover('show');
                                    }
                                    break;
                            }
                            if ($(this).data('timestamp')) {
                                self.player.seek($(this).data('timestamp'));
                                self.player.play();
                            }
                        });

                    $playerWrapper.off('click', `.popover-dismiss`).on('click', `.popover-dismiss`, function(e) {
                        e.stopImmediatePropagation();
                        $(this).closest('.popover').remove();
                    });
                }
            }
        };

        // Check resize on video wrapper resize
        let vwrapper = document.querySelector('#video-wrapper');
        let resizeTimeout;

        let resizeObserver = new ResizeObserver(() => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
            let existingwrapper = $canvas.find(`.annotation-wrapper`);
            if (existingwrapper.length === 0) {
                return;
            }
            existingwrapper.each(function() {
                let wrapper = $(this);
                let type = wrapper.data('type');
                if (
                type === 'textblock' ||
                type === 'audio' ||
                type === 'stopwatch' ||
                type === 'file' ||
                type === 'navigation'
                ) {
                recalculatingTextSize(wrapper, type !== 'textblock', type === 'textblock');
                } else if (type === 'video') {
                recalculatingSize(wrapper);
                let aspectRatio =
                    wrapper.find('.annotation-content').width() / wrapper.find('.annotation-content').height();
                if (wrapper.width() / wrapper.height() !== aspectRatio) {
                    wrapper.height(wrapper.width() / aspectRatio);
                }
                }
                $canvas.css('font-size', $canvas.width() / 75 + 'px');
            });
            }, 100);
        });
        resizeObserver.observe(vwrapper);

        // Ready to render items.
        let items = [];
        let tracking = [];
        let trackingIndex = 0;
        if (data.items != '' && data.items !== null) {
            items = JSON.parse(data.items);
            tracking.push({
                items: JSON.stringify(items),
                actives: null,
                at: new Date().getTime(),
            });
        }
        let draftitemid = data.draftitemid;

        renderItems(items, null, false);

        // Render the inline annotation toolbar
        if (this.isEditMode()) {
            $('#inlineannotation-btns').remove();
            let inlineannotationitems = [
                {
                    'icon': 'bi bi-image',
                    'type': 'media',
                    'mediatype': 'image',
                    'label': M.util.get_string('image', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-film',
                    'type': 'media',
                    'mediatype': 'video',
                    'label': M.util.get_string('video', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-volume-up',
                    'type': 'media',
                    'mediatype': 'audio',
                    'label': M.util.get_string('audio', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-alphabet-uppercase',
                    'type': 'textblock',
                    'mediatype': 'textblock',
                    'label': M.util.get_string('text', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-circle-square',
                    'type': 'shape',
                    'mediatype': 'shape',
                    'label': M.util.get_string('shape', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-stopwatch',
                    'type': 'stopwatch',
                    'mediatype': 'stopwatch',
                    'label': M.util.get_string('stopwatch', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-file-earmark-arrow-down',
                    'type': 'media',
                    'mediatype': 'file',
                    'label': M.util.get_string('inlinefile', 'local_ivinlineannotation'),
                },
                {
                    'icon': 'bi bi-sign-turn-right',
                    'type': 'navigation',
                    'mediatype': 'navigation',
                    'label': M.util.get_string('navigation', 'local_ivinlineannotation')
                },
                {
                    'icon': 'bi bi-plus-circle',
                    'type': 'hotspot',
                    'mediatype': 'hotspot',
                    'label': M.util.get_string('hotspot', 'local_ivinlineannotation'),
                }
            ];
            const dataForTemplate = {
                id: annotation.id,
                items: inlineannotationitems,
            };

            Templates.render('local_ivinlineannotation/toolbar', dataForTemplate).then((html) => {
                return $videoWrapper.before(html);
            }).catch(() => {
                // Do nothing.
            });

            self.enableColorPicker();
        }

        $(document).one('iv:playerSeek iv:playerPlay', function(e) {
            if (seeking) {
                return;
            }
            $('body').removeClass('disablekb');
            let newTime = e.detail.time;
            if (Math.floor(newTime) != annotation.timestamp) {
                $(`#inlineannotation-btns`).remove();
                $('.inlineannotation-popover').remove();
                $canvas.remove();
            }
        });

        $playerWrapper.off('click', `#canvas`).on('click', `#canvas`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!self.isEditMode()) {
                self.player.play();
            } else {
                $canvas.find('.annotation-wrapper').removeClass('active');
                $('#inlineannotation-btns .btn').removeClass('active rotatey-360');
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
            }
        });

        // End of view mode.
        if (!self.isEditMode()) {
            return;
        }

        /**
         * Update tracking data for redo and undo
         * @param {Array} actives array of active items
         */
        const saveTracking = (actives) => {
            if (trackingIndex < tracking.length - 1) {
                // Remove all the tracking data after the current index.
                tracking = tracking.slice(0, trackingIndex + 1);
            }
            tracking.push({
                items: JSON.stringify(items),
                actives: actives,
                at: new Date().getTime(),
            });
            tracking.sort((a, b) => a.at - b.at);
            trackingIndex = tracking.length - 1;
            $('#inlineannotation-btns #undo').removeAttr('disabled');
            $('#inlineannotation-btns #redo').attr('disabled', 'disabled');
            if (tracking.length == 1) {
                $('#inlineannotation-btns #undo').attr('disabled', 'disabled');
            }
        };

        /**
         * Order items by layer.
         * @param {Array} ids array of item ids
         * @param {String} order asc or desc
         * @returns {Array} sorted array of item ids
         */
        const sortItemsByLayer = (ids, order) => {
            ids = ids.map(x => x.toString()); // Convert ids to string for consistency.
            let targetItems = items.filter(item => {
                const id = item.id.toString();
                return ids.includes(id);
            });
            if (order == 'desc') {
                targetItems.sort((a, b) => b.position['z-index'] - a.position['z-index']);
            } else {
                targetItems.sort((a, b) => a.position['z-index'] - b.position['z-index']);
            }

            return targetItems.map(item => item.id);
        };

        /**
         * Get highest z-index.
         * @param {Array} itms array of items
         * @returns {Number} top z-index
         */
        const getTopLayer = (itms) => {
            if (itms.length == 0) {
                return 5;
            }
            let ids = itms.map(item => item.id);
            let sorted = sortItemsByLayer(ids, 'desc');
            let zindex = itms.find(item => item.id == sorted[0]).position['z-index'];
            return Number(zindex);
        };

        /**
         * Get lowest z-index.
         * @param {Array} itms array of items
         * @returns {Number} bottom z-index
         */
        const getBottomLayer = (itms) => {
            if (itms.length == 0) {
                return 5;
            }
            let ids = itms.map(item => item.id);
            let sorted = sortItemsByLayer(ids, 'asc');
            let zindex = itms.find(item => item.id == sorted[0]).position['z-index'];
            return Number(zindex);
        };

        /**
         * Get all items from the annotation-canvas.
         * @param {Boolean} updateid whether or not to update the id of the item.
         */
        const getItems = (updateid) => {
            let newItems = [];
            $canvas.find(`.annotation-wrapper`).each(function(index, element) {
                const id = $(element).data('item');
                let item = {
                    "type": $(element).data('type'),
                    "position": recalculatingSize($(element)),
                };
                item.id = id;
                item.properties = items.find(x => x.id == id).properties;
                if (updateid) {
                    item.id = new Date().getTime() + index;
                    $(element).attr('data-item', item.id);
                }
                newItems.push(item);
            });
            items = newItems;
            draftStatus = 'draft';
        };

        $playerWrapper.off('click', `#inlineannotation-btns #save`).on('click', `#inlineannotation-btns #save`, function(e) {
            e.stopImmediatePropagation();
            getItems(false);
            // Encode html tags
            let cleanItems = JSON.stringify(items).replace(/</g, '&lt;').replace(/>/g, '&gt;');
            let updateId = $canvas.data('id');
            $.ajax({
                url: M.cfg.wwwroot + '/mod/interactivevideo/ajax.php',
                method: "POST",
                dataType: "text",
                data: {
                    action: 'quick_edit_field',
                    sesskey: M.cfg.sesskey,
                    id: updateId,
                    field: 'content',
                    contextid: annotation.contextid,
                    draftitemid: draftitemid,
                    value: cleanItems,
                    cmid: self.cmid,
                    token: self.token,
                },
                success: function(data) {
                    let updated = JSON.parse(data);
                    draftStatus = null;
                    tracking = [];
                    $('#inlineannotation-btns #redo, #inlineannotation-btns #undo').attr('disabled', 'disabled');
                    self.dispatchEvent('annotationupdated', {
                        annotation: updated,
                        action: 'edit',
                    });
                }
            });
        });

        $(document).off('click', `#inlineannotation-btns #closetoolbar`)
            .on('click', `#inlineannotation-btns #closetoolbar`, function(e) {
                e.stopImmediatePropagation();
                if (draftStatus == 'draft') {
                    Notification.saveCancel(
                        M.util.get_string('unsavedchange', 'local_ivinlineannotation'),
                        M.util.get_string('unsavedchangeconfirm', 'local_ivinlineannotation'),
                        M.util.get_string('save', 'local_ivinlineannotation'),
                        function() {
                            // If the user clicks save, save the changes.
                            $('#inlineannotation-btns #save').trigger('click');
                            draftStatus = null;
                            tracking = [];
                            $(`#inlineannotation-btns #closetoolbar`).trigger('click');
                        },
                        function() {
                            $(`#inlineannotation-btns`).remove();
                            $('#canvas[data-id="' + annotation.id + '"]').remove();
                            $('body').removeClass('disablekb');
                        }
                    );
                } else {
                    $(`#inlineannotation-btns`).remove();
                    $('#canvas[data-id="' + annotation.id + '"]').remove();
                    $('#content-region, #timeline-wrapper').removeClass('no-pointer-events');
                    $('body').removeClass('disablekb');
                }
            });

        $(document).off('click', `#inlineannotation-btns #hideshow`).on('click', `#inlineannotation-btns #hideshow`, function(e) {
            e.stopImmediatePropagation();
            if ($(this).find('i').hasClass('bi-eye-slash')) {
                $('#canvas[data-id="' + annotation.id + '"]').find('.annotation-wrapper').hide();
            } else {
                $('#canvas[data-id="' + annotation.id + '"]').find('.annotation-wrapper').show();
            }
            $(this).find('i').toggleClass('bi-eye bi-eye-slash');
        });
        /**
         * Handle form data when adding or editing an item.
         * @param {Object} newItem data from form submission
         * @param {String} type type of the item
         * @param {Boolean} add adding or editing
         */
        const handleFormData = (newItem, type, add) => {
            switch (type) {
                case 'audio':
                case 'file':
                    if (add) {
                        newItem.position.height = '40px';
                        newItem.position.width = '130px';
                    }
                    break;
                case 'textblock':
                    if (add) {
                        newItem.position.fontSize = '16px';
                        newItem.position.lineHeight = '20px';
                    }
                    break;
                case 'navigation':
                case 'stopwatch':
                    if (add) {
                        newItem.position.height = '40px';
                        newItem.position.width = '130px';
                    }
                    break;
                case 'shape':
                    if (add) {
                        newItem.position.height = '100px';
                        newItem.position.width = '100px';
                    }
                    break;
                case 'video':
                case 'image':
                    newItem.position.height = 'auto';
                    break;
                case 'hotspot':
                    if (add) {
                        newItem.position.width = '5%';
                    }
                    break;
            }

            items.push(newItem);
            saveTracking([newItem.id]);
            renderItems([newItem], [newItem.id], true);
        };

        $playerWrapper.off('click', `#inlineannotation-btns .add-ia`).on('click', `#inlineannotation-btns .add-ia`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annoid = $canvas.data('id');
            let type = $(this).attr('data-mediatype');
            if (type == 'stopwatch' && items.find(x => x.type == 'stopwatch')) {
                self.addNotification(M.util.get_string('onlyonestopwatch', 'local_ivinlineannotation'), 'danger');
                return;
            }
            let iaform = new ModalForm({
                formClass: "local_ivinlineannotation\\items\\" + $(this).attr('data-type'),
                args: {
                    contextid: annotation.contextid,
                    id: 0,
                    type: type,
                    annotationid: annoid,
                },
                modalConfig: {
                    title: M.util.get_string('addinlineannotation', 'local_ivinlineannotation',
                        M.util.get_string(type, 'local_ivinlineannotation')),
                }
            });

            iaform.show();

            iaform.addEventListener(iaform.events.LOADED, () => {
                iaform.modal.modal.draggable({
                    handle: ".modal-header",
                });
                if (type == 'navigation' || type == 'image' || type == 'shape') {
                    $(document).on('change', '[name="timestamp"]', function(e) {
                        e.preventDefault();
                        let parts = $(this).val().split(':');
                        let timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (!self.isBetweenStartAndEnd(timestamp)) {
                            let message = M.util.get_string('timemustbebetweenstartandendtime', 'local_ivinlineannotation', {
                                "start": self.convertSecondsToHMS(self.start),
                                "end": self.convertSecondsToHMS(self.end),
                            });
                            self.addNotification(message);
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }

                        // Make sure the timestamp is not in the skip segment.
                        if (self.isInSkipSegment(timestamp)) {
                            self.addNotification(M.util.get_string('interactionisbetweentheskipsegment',
                                'local_ivinlineannotation'));
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }
                    });
                }
            });

            iaform.addEventListener(iaform.events.FORM_SUBMITTED, (e) => {
                e.stopImmediatePropagation();
                getItems(false);
                const highestOrder = getTopLayer(items);
                let left = Math.random() * 100;
                let top = Math.random() * 100;
                let newItem = {
                    "id": new Date().getTime(),
                    "type": type,
                    "position": {
                        "width": "30%",
                        "left": left + "px",
                        "top": top + "px",
                        "z-index": highestOrder + 1,
                    },
                    'properties': e.detail,
                };
                handleFormData(newItem, type, true);
            });
        });

        $playerWrapper.off('click', `#inlineannotation-btns #edit`).on('click', `#inlineannotation-btns #edit`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let annnoid = $canvas.data('id');
            let active = $('#edit-btns').attr('data-active');
            getItems(false);
            let item = items.find(x => x.id == active);
            let type = item.type;
            let formdata = {...item.properties};
            formdata.contextid = annotation.contextid;
            formdata.id = item.id;
            formdata.annotationid = annnoid;
            formdata.type = type;
            let editform = new ModalForm({
                formClass: "local_ivinlineannotation\\items\\" +
                    (type == 'image' || type == 'video' || type == 'audio' || type == 'file' ? 'media' : type),
                args: formdata,
                modalConfig: {
                    title: M.util.get_string('editinlineannotation', 'local_ivinlineannotation',
                        M.util.get_string(type, 'local_ivinlineannotation')),
                }
            });

            editform.show();

            editform.addEventListener(editform.events.LOADED, () => {
                editform.modal.modal.draggable({
                    handle: ".modal-header",
                });
                if (type == 'navigation' || type == 'image' || type == 'shape') {
                    $(document).on('change', '[name="timestamp"]', function(e) {
                        e.preventDefault();
                        let parts = $(this).val().split(':');
                        let timestamp = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
                        if (!self.isBetweenStartAndEnd(timestamp)) {
                            let message = M.util.get_string('timemustbebetweenstartandendtime', 'mod_interactivevideo', {
                                "start": self.convertSecondsToHMS(self.start),
                                "end": self.convertSecondsToHMS(self.end),
                            });
                            self.addNotification(message);
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }

                        // Make sure the timestamp is not in the skip segment.
                        if (self.isInSkipSegment(timestamp)) {
                            self.addNotification(M.util.get_string('interactionisbetweentheskipsegment', 'mod_interactivevideo'));
                            $(this).val($(this).attr('data-initial-value'));
                            return;
                        }
                    });
                }
            });

            editform.addEventListener(editform.events.FORM_SUBMITTED, (e) => {
                e.stopImmediatePropagation();
                getItems(false);
                item = items.find(x => x.id == active);
                item.properties = e.detail;
                // Remove the item from the annotation-canvas
                $videoWrapper.find(`.annotation-wrapper[data-item="${active}"]`).remove();
                items = items.filter(x => x.id != active);
                handleFormData(item, type, false);
            });
        });

        $canvas.off('click', `.annotation-wrapper`).on('click', `.annotation-wrapper`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (!e.ctrlKey && !e.metaKey) {
                $canvas.find('.annotation-wrapper').removeClass('active');
                $(this).addClass('active');
                this.focus();
                recalculatingSize($(this));
            } else {
                if ($(this).hasClass('active')) {
                    $(this).removeClass('active');
                } else {
                    $(this).addClass('active');
                    this.focus();
                }
            }

            if (!isNaN(Number($(this).data('group')))) {
                let group = $(this).data('group');
                $canvas.find(`.annotation-wrapper[data-group="${group}"]`).addClass('active');
            }

            recalculatingSize($(this));

            let activewrapper = $canvas.find('.annotation-wrapper.active');
            if (activewrapper.length == 0) {
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
                $('#inlineannotation-btns #edit').attr('disabled', 'disabled');
                $('#inlineannotation-btns #edit').removeAttr('disabled');
            } else {
                let dataActive = activewrapper.map(function() {
                    return $(this).data('item');
                }).get();
                $('#edit-btns').attr('data-active', dataActive).addClass('d-flex').removeClass('d-none');
                if (activewrapper.length > 1) {
                    $('#inlineannotation-btns #edit').attr('disabled', 'disabled');
                    $('#edit-btns #position').addClass('d-none');
                } else {
                    $('#inlineannotation-btns #edit').removeAttr('disabled');
                    $('#edit-btns #position').removeClass('d-none');
                }
            }

            // Enable ungroup button if the active items are grouped.
            let grouping = activewrapper.map(function() {
                if (isNaN($(this).data('group')) || $(this).data('group') == '') {
                    return '';
                }
                return $(this).data('group');
            }).get();

            grouping = [...new Set(grouping)];

            if (activewrapper.length < 2) {
                $('#inlineannotation-btns #ungroup, #inlineannotation-btns #group').attr('disabled', 'disabled').addClass('d-none');
            } else {
                if (grouping.length == 1) {
                    if (isNaN(grouping[0]) || grouping[0] == '') {
                        $('#inlineannotation-btns #ungroup').attr('disabled', 'disabled').addClass('d-none');
                        $('#inlineannotation-btns #group').removeAttr('disabled').removeClass('d-none');
                    } else {
                        $('#inlineannotation-btns #ungroup').removeAttr('disabled').removeClass('d-none');
                        $('#inlineannotation-btns #group').attr('disabled', 'disabled').addClass('d-none');
                    }
                } else if (grouping.length > 1) {
                    $('#inlineannotation-btns #ungroup, #inlineannotation-btns #group').removeAttr('disabled')
                        .removeClass('d-none');
                }
            }
        });

        $canvas.off('dblclick', '.annotation-wrapper').on('dblclick', '.annotation-wrapper', function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).trigger('click');
            $('#inlineannotation-btns #edit').trigger('click');
        });

        $(document).off('click', `#inlineannotation-btns #undo`).on('click', `#inlineannotation-btns #undo`, async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (trackingIndex == 0) {
                return;
            }
            trackingIndex--;
            const instance = tracking[trackingIndex];
            items = JSON.parse(instance.items);
            renderItems(items, instance.actives, false);
            if (trackingIndex == 0) {
                $('#inlineannotation-btns #undo').attr('disabled', 'disabled');
                $('#inlineannotation-btns #redo').removeAttr('disabled');
            } else {
                $('#inlineannotation-btns #undo').removeAttr('disabled');
                if (trackingIndex == tracking.length - 1) {
                    $('#inlineannotation-btns #redo').attr('disabled', 'disabled');
                } else {
                    $('#inlineannotation-btns #redo').removeAttr('disabled');
                }
            }
        });

        $(document).off('click', `#inlineannotation-btns #redo`).on('click', `#inlineannotation-btns #redo`, async function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (trackingIndex == tracking.length - 1) {
                return;
            }
            trackingIndex++;
            const instance = tracking[trackingIndex];
            items = JSON.parse(instance.items);
            renderItems(items, instance.actives, false);
            if (trackingIndex == tracking.length - 1) {
                $('#inlineannotation-btns #redo').attr('disabled', 'disabled');
                $('#inlineannotation-btns #undo').removeAttr('disabled');
            } else {
                $('#inlineannotation-btns #redo').removeAttr('disabled');
                if (trackingIndex == 0) {
                    $('#inlineannotation-btns #undo').attr('disabled', 'disabled');
                } else {
                    $('#inlineannotation-btns #undo').removeAttr('disabled');
                }
            }
        });

        const updateOrder = (active, direction) => {
            // First sort items by z-index descending
            getItems(false);
            items.sort((a, b) => b.position['z-index'] - a.position['z-index']);
            let activeIndex = items.findIndex(x => x.id == active);
            let activeItem = items[activeIndex];
            let currentzIndex = activeItem.position['z-index'];
            let affectedItem = null;
            let affectedItemIndex = null;
            if (direction == 'up') {
                if (activeIndex == 0) {
                    return;
                }
                affectedItemIndex = activeIndex - 1;
                affectedItem = items[affectedItemIndex];
                activeItem.position['z-index'] = affectedItem.position['z-index'];
                affectedItem.position['z-index'] = currentzIndex;
            } else {
                if (activeIndex == items.length - 1) {
                    return;
                }
                affectedItemIndex = activeIndex + 1;
                affectedItem = items[affectedItemIndex];
                activeItem.position['z-index'] = affectedItem.position['z-index'];
                affectedItem.position['z-index'] = currentzIndex;
            }
            items[activeIndex] = activeItem;
            items[affectedItemIndex] = affectedItem;
            $(`.annotation-wrapper[data-item="${active}"]`).css(activeItem.position);
            $(`.annotation-wrapper[data-item="${affectedItem.id}"]`).css(affectedItem.position);
            saveTracking([active]);
        };

        // Group the active items
        $(document).off('click', `#inlineannotation-btns #group`).on('click', `#inlineannotation-btns #group`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).attr('disabled', 'disabled').addClass('d-none');
            $('#inlineannotation-btns #ungroup').removeAttr('disabled').removeClass('d-none');
            getItems(false);
            let active = $canvas.find('.annotation-wrapper.active').map(function() {
                return $(this).data('item');
            }).get();
            const group = new Date().getTime();
            active.forEach((item, i) => {
                let activeItem = $canvas.find(`.annotation-wrapper[data-item="${item}"]`);
                let targetIndex = items.findIndex(x => x.id == item);
                let target = JSON.parse(JSON.stringify(items[targetIndex]));
                target.position.group = group;
                items[targetIndex] = target;
                activeItem.remove();
                renderItems([target], null, true);
                if (i == active.length - 1) {
                    renderItems([], active, true);
                }
            });
            saveTracking(active);
        });

        $(document).off('click', `#inlineannotation-btns #ungroup`).on('click', `#inlineannotation-btns #ungroup`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            $(this).attr('disabled', 'disabled').addClass('d-none');
            $(`#inlineannotation-btns #group`).removeAttr('disabled').removeClass('d-none');
            getItems(false);
            let active = $canvas.find('.annotation-wrapper.active').map(function() {
                return $(this).data('item');
            }).get();
            active.forEach((item, i) => {
                let activeItem = $canvas.find(`.annotation-wrapper[data-item="${item}"]`);
                let targetIndex = items.findIndex(x => x.id == item);
                let target = JSON.parse(JSON.stringify(items[targetIndex]));
                delete target.position.group;
                items[targetIndex] = target;
                activeItem.remove();
                renderItems([target], null, true);
                if (i == active.length - 1) {
                    renderItems([], active, true);
                }
            });
            saveTracking(active);
        });

        $playerWrapper.off('click', `#inlineannotation-btns #up`).on('click', `#inlineannotation-btns #up`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            const topLayer = getTopLayer(items);
            // Check if the active elements are already in the correct order based on their index positions in the items array
            if (active.length > 1) {
                active = sortItemsByLayer(active, 'desc');
                let indexes = [];
                items.sort((a, b) => b.position['z-index'] - a.position['z-index']);
                active.forEach((item) => {
                    indexes.push(items.findIndex(x => x.id == item));
                });
                indexes.sort((a, b) => a - b);
                if (Math.abs(indexes[0] - indexes[indexes.length - 1]) == active.length - 1) {
                    if (Number(items[indexes[0]].position['z-index']) == topLayer) {
                        return;
                    }
                }
            }
            active.forEach((item) => {
                updateOrder(item, 'up');
            });
            getItems(false);
            updatePositionInfo($(`.annotation-wrapper[data-item="${active[0]}"]`));
        });

        $playerWrapper.off('click', `#inlineannotation-btns #down`).on('click', `#inlineannotation-btns #down`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            const bottomLayer = getBottomLayer(items);
            // Check if the active elements are already in the correct order based on their index positions in the items array
            if (active.length > 1) {
                active = sortItemsByLayer(active, 'asc');
                let indexes = [];
                items.sort((a, b) => a.position['z-index'] - b.position['z-index']);
                active.forEach((item) => {
                    indexes.push(items.findIndex(x => x.id == item));
                });
                indexes.sort((a, b) => a - b);
                if (Math.abs(indexes[0] - indexes[indexes.length - 1]) == active.length - 1) {
                    if (Number(items[indexes[0]].position['z-index']) == bottomLayer) {
                        return;
                    }
                }
            }
            active.forEach((item) => {
                updateOrder(item, 'down');
            });
            getItems(false);
            updatePositionInfo($(`.annotation-wrapper[data-item="${active[0]}"]`));
        });

        $playerWrapper.off('click', `#inlineannotation-btns #delete`).on('click', `#inlineannotation-btns #delete`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            active.forEach((item) => {
                let activeItem = $canvas.find(`.annotation-wrapper[data-item="${item}"]`);
                activeItem.remove();
                $('#edit-btns').attr('data-active', '').addClass('d-none').removeClass('d-flex');
            });
            getItems(false);
            saveTracking(null);
        });

        $playerWrapper.off('click', `#inlineannotation-btns #copy`).on('click', `#inlineannotation-btns #copy`, function(e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            getItems(false);
            // Copy the active item
            const highestOrder = getTopLayer(items);
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            active = sortItemsByLayer(active, 'asc');
            let newItems = [];
            for (let i = 0; i < active.length; i++) {
                let a = active[i];
                let activeItem = $canvas.find(`.annotation-wrapper[data-item="${a}"]`);
                activeItem.removeClass('active');
                const item = items.find(x => x.id == a);
                let newItem = JSON.parse(JSON.stringify(item));
                newItem.position = recalculatingSize(activeItem);
                if (item.position.group) {
                    newItem.position.group = Number(item.position.group) + 1;
                }
                newItem.id = new Date().getTime() + i;
                newItems.push(newItem);
                newItem.position['z-index'] = Number(highestOrder) + i + 1;
                items.push(newItem);
                if (i == active.length - 1) {
                    const newItemIds = newItems.map(x => x.id);
                    $('#edit-btns').attr('data-active', newItemIds.join(',')).addClass('d-flex').removeClass('d-none');
                    renderItems(newItems, newItemIds, true);
                    // Put focus on the first element
                    getItems(false);
                    document.querySelector('.annotation-wrapper.active').focus();
                    updatePositionInfo($(`.annotation-wrapper[data-item="${newItem.id}"]`));
                    saveTracking(newItemIds);
                }
            }
        });

        // Move items with keyboard arrow keys, ctrl + up to layer up, and ctrl + down to layer down.
        $playerWrapper.on('keydown', '#canvas .annotation-wrapper', function(e) {
            let active = $('#edit-btns').attr('data-active');
            active = active.split(',');
            for (let i = 0; i < active.length; i++) {
                let a = active[i];
                let activeItem = $canvas.find(`.annotation-wrapper[data-item="${a}"]`);
                if (activeItem != undefined) {
                    let position = activeItem.position();
                    position['z-index'] = parseInt(activeItem.css('z-index'));
                    let ctrl = e.ctrlKey || e.metaKey;
                    let step = 1;
                    // Prevent page scroll
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    switch (e.key) {
                        case 'ArrowUp':
                            if (position.top > 0) {
                                position.top = position.top - step;
                                saveTracking(active);
                            }
                            break;
                        case 'ArrowDown':
                            if (position.top + activeItem.outerHeight() < $canvas.height()) {
                                position.top = position.top + step;
                                saveTracking(active);
                            }
                            break;
                        case 'ArrowLeft':
                            if (position.left > 0) {
                                position.left = position.left - step;
                                saveTracking(active);
                            }
                            break;
                        case 'ArrowRight':
                            if (position.left + activeItem.outerWidth() < $canvas.width()) {
                                position.left = position.left + step;
                                saveTracking(active);
                            }
                            break;
                        case 'Delete':
                            $(`#inlineannotation-btns #delete`).trigger('click');
                            return;
                        case 'd': // Ctrl + d to duplicate
                            if (ctrl) {
                                $(`#inlineannotation-btns #copy`).trigger('click');
                            }
                            return;
                        default:
                            return;
                    }
                    activeItem.css(position);
                    recalculatingSize(activeItem);
                }
            }
        });

        $(document).on('annotationdeleted', function(e) {
            let deleted = e.originalEvent.detail.annotation;
            let annoid = $canvas.data('id');
            if (annoid == deleted.id) {
                $videoWrapper.find(`#canvas[data-id='${annoid}']`).remove();
                $(`#inlineannotation-btns`).remove();
            }
        });

        // Confirm draft saved.
        window.addEventListener('beforeunload', (e) => {
            if (draftStatus !== null) {
                const confirmationMessage = M.util.get_string('unsavedchanges', 'mod_interactivevideo');
                e.returnValue = confirmationMessage;
                return confirmationMessage;
            }
            return true;
        });

        self.timepicker();
        $(document).on('click', '.pickatime button', function() {
            seeking = true;
        });
        $(document).on('click', '#confirmtime', async function() {
            seeking = false;
        });
    }
    /**
     * What happens when an item runs
     * @param {Object} annotation The annotation object
     * @returns {void}
     */
    async runInteraction(annotation) {
        let self = this;
        await this.player.pause();
        this.renderContainer(annotation);
        if (this.isEditMode()) {
            annotation.editmode = true; // Use editmode to render the draft content (i.e draft.php vs plugin.php).
            // Disable the content-region and the timeline-wrapper.
            $('#content-region, #timeline-wrapper').addClass('no-pointer-events');
        }
        // We don't need to run the render method every time the content is applied. We can cache the content.
        if (!self.cache[annotation.id] || self.isEditMode()) {
            self.cache[annotation.id] = await self.render(annotation, 'json');
        }
        let content = self.cache[annotation.id];
        this.postContentRender(annotation, content);
        document.querySelector('#canvas').focus();
        $('body').addClass('disablekb');
    }
}