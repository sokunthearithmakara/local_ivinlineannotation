<?php
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
 * Class stopwatch
 *
 * @package    local_ivinlineannotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_ivinlineannotation\items;
use context_user;
use moodle_url;

/**
 * Dynamic form for adding/editing stopwatch element
 *
 * @package     local_ivinlineannotation
 * @copyright   2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license     https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class stopwatch extends \core_form\dynamic_form {
    /**
     * Returns form context
     *
     * If context depends on the form data, it is available in $this->_ajaxformdata or
     * by calling $this->optional_param()
     *
     * @return \context
     */
    protected function get_context_for_dynamic_submission(): \context {
        $contextid = $this->optional_param('contextid', null, PARAM_INT);
        return \context::instance_by_id($contextid, MUST_EXIST);
    }

    /**
     * Checks access for dynamic submission
     */
    protected function check_access_for_dynamic_submission(): void {
        require_capability('mod/interactivevideo:addinstance', $this->get_context_for_dynamic_submission());
    }

    /**
     * Sets data for dynamic submission
     */
    public function set_data_for_dynamic_submission(): void {
        $data = new \stdClass();
        $data->id = $this->optional_param('id', 0, PARAM_INT);
        $data->contextid = $this->optional_param('contextid', null, PARAM_INT);
        $data->annotationid = $this->optional_param('annotationid', null, PARAM_INT);

        $data->duration = $this->optional_param('duration', null, PARAM_INT);
        $data->allowpause = $this->optional_param('allowpause', null, PARAM_INT);
        $data->style = $this->optional_param('style', null, PARAM_TEXT);
        $data->rounded = $this->optional_param('rounded', null, PARAM_INT);
        $data->shadow = $this->optional_param('shadow', 0, PARAM_INT);
        $data->playalarmsound = new \stdClass();
        $data->playalarmsound->playsoundatend = $this->optional_param('playsoundatend', null, PARAM_INT);
        $data->playalarmsound->playsoundatinterval = $this->optional_param('playsoundatinterval', null, PARAM_INT);
        $data->playalarmsound->intervaltime = $this->optional_param('intervaltime', null, PARAM_INT);

        $this->set_data($data);
    }

    /**
     * Process dynamic submission
     */
    public function process_dynamic_submission() {
        global $USER;
        $usercontextid = context_user::instance($USER->id)->id;

        $fromform = $this->get_data();
        $fromform->usercontextid = $usercontextid;

        return $fromform;
    }

    /**
     * Form definition
     */
    public function definition() {
        $mform = $this->_form;
        $mform->addElement('hidden', 'contextid', null);
        $mform->setType('contextid', PARAM_INT);
        $mform->addElement('hidden', 'id', 0);
        $mform->setType('id', PARAM_INT);
        $mform->addElement('hidden', 'annotationid', 0);
        $mform->setType('annotationid', PARAM_INT);

        $mform->addElement('text', 'duration', get_string('durationinminute', 'local_ivinlineannotation'), ['size' => 100]);
        $mform->setType('duration', PARAM_INT);
        $mform->addRule('duration', get_string('required'), 'required', null, 'client');
        $mform->addRule('duration', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client');
        $mform->addRule('duration', get_string('nonzero', 'mod_interactivevideo'), 'nonzero', null, 'client');
        $mform->setDefault('duration', 1);
        $mform->addElement(
            'advcheckbox',
            'allowpause',
            '',
            get_string('allowpause', 'local_ivinlineannotation'),
            null,
            [0, 1]
        );
        $mform->addElement('select', 'style', get_string('style', 'local_ivinlineannotation'), [
            'btn-danger' => get_string('danger', 'local_ivinlineannotation'),
            'btn-warning' => get_string('warning', 'local_ivinlineannotation'),
            'btn-success' => get_string('success', 'local_ivinlineannotation'),
            'btn-primary' => get_string('primary', 'local_ivinlineannotation'),
            'btn-secondary' => get_string('secondary', 'local_ivinlineannotation'),
            'btn-info' => get_string('info', 'local_ivinlineannotation'),
            'btn-light' => get_string('light', 'local_ivinlineannotation'),
            'btn-dark' => get_string('dark', 'local_ivinlineannotation'),
            'btn-outline-danger' => get_string('dangeroutline', 'local_ivinlineannotation'),
            'btn-outline-warning' => get_string('warningoutline', 'local_ivinlineannotation'),
            'btn-outline-success' => get_string('successoutline', 'local_ivinlineannotation'),
            'btn-outline-primary' => get_string('primaryoutline', 'local_ivinlineannotation'),
            'btn-outline-secondary' => get_string('secondaryoutline', 'local_ivinlineannotation'),
            'btn-outline-info' => get_string('infooutline', 'local_ivinlineannotation'),
            'btn-outline-light' => get_string('lightoutline', 'local_ivinlineannotation'),
            'btn-outline-dark' => get_string('darkoutline', 'local_ivinlineannotation'),
            'btn-transparent' => get_string('transparent', 'local_ivinlineannotation'),
        ]);

        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'rounded',
            '',
            get_string('rounded', 'local_ivinlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'shadow',
            '',
            get_string('shadow', 'local_ivinlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $mform->addGroup($elementarray, '', '');

        $intervalelem = [];
        $intervalelem[] = $mform->createElement(
            'advcheckbox',
            'playsoundatend',
            '',
            get_string('playsoundatend', 'local_ivinlineannotation'),
            null,
            [0, 1]
        );
        $mform->setDefault(
            'playalarmsound[playsoundatend]',
            $this->optional_param('playalarmsound[playsoundatend]', 1, PARAM_INT)
        );
        $intervalelem[] = $mform->createElement(
            'advcheckbox',
            'playsoundatinterval',
            '',
            get_string('playsoundatinterval', 'local_ivinlineannotation'),
            null,
            [0, 1]
        );
        $mform->setDefault(
            'playalarmsound[playsoundatinterval]',
            $this->optional_param('playalarmsound[playsoundatinterval]', 1, PARAM_INT)
        );
        $intervalelem[] = $mform->createElement(
            'text',
            'intervaltime',
            get_string('numberofminutes', 'local_ivinlineannotation'),
            ['size' => 5]
        );
        $mform->setType('intervaltime', PARAM_INT);
        $mform->setDefault('playalarmsound[intervaltime]', $this->optional_param('playalarmsound[intervaltime]', 1, PARAM_INT));

        $mform->addGroup($intervalelem, 'playalarmsound', get_string('playalarmsound', 'local_ivinlineannotation'));
        $mform->addGroupRule(
            'playalarmsound',
            ['intervaltime' => [
                [get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client'],
                [get_string('nonzero', 'mod_interactivevideo'), 'nonzero', null, 'client'],
            ]]
        );
        $this->set_display_vertical();
    }

    /**
     * Validates form data
     *
     * @param array $data
     * @param array $files
     * @return array
     */
    public function validation($data, $files) {
        $errors = [];
        return $errors;
    }

    /**
     * Returns page URL for dynamic submission
     *
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }
}

