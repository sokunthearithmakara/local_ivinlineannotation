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

namespace local_ivinlineannotation\items;

/**
 * Class text
 *
 * @package    local_ivinlineannotation
 * @copyright  2024 Sokunthearith Makara <sokunthearithmakara@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class text extends \core_form\dynamic_form {
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

        $data->label = $this->optional_param('label', null, PARAM_TEXT);
        $data->url = $this->optional_param('url', null, PARAM_URL);
        $data->bold = $this->optional_param('bold', null, PARAM_INT);
        $data->italic = $this->optional_param('italic', null, PARAM_INT);
        $data->underline = $this->optional_param('underline', null, PARAM_INT);
        $data->textcolor = $this->optional_param('textcolor', null, PARAM_TEXT);
        $data->textfont = $this->optional_param('textfont', null, PARAM_TEXT);
        $data->bgcolor = $this->optional_param('bgcolor', null, PARAM_TEXT);
        $data->bordercolor = $this->optional_param('bordercolor', null, PARAM_TEXT);
        $data->borderwidth = $this->optional_param('borderwidth', null, PARAM_INT);
        $data->shadow = $this->optional_param('shadow', 0, PARAM_INT);
        $this->set_data($data);
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

        $mform->addElement('text', 'label', get_string('label', 'local_ivinlineannotation'), ['size' => 100]);
        $mform->setType('label', PARAM_TEXT);
        $mform->addRule('label', get_string('required'), 'required', null, 'client');

        $elementarray = [];
        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'bold',
            '',
            get_string('textbold', 'local_ivinlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'italic',
            '',
            get_string('textitalic', 'local_ivinlineannotation'),
            ['group' => 1],
            [0, 1]
        );

        $elementarray[] = $mform->createElement(
            'advcheckbox',
            'underline',
            '',
            get_string('textunderline', 'local_ivinlineannotation'),
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

        $mform->addElement('text', 'url', get_string('url', 'local_ivinlineannotation'), ['size' => 100]);
        $mform->setType('text', PARAM_URL);
        $mform->addRule(
            'url',
            get_string('invalidurlformat', 'local_ivinlineannotation'),
            'regex',
            "/\b(?:(?:https?|ftp):\/\/|www\.)[-a-z0-9+&@#\/%?=~_|!:,.;]*\.[a-z]{2,}[-a-z0-9+&@#\/%=~_|]*/i",
            'client'
        );

        $mform->addElement(
            'text',
            'textcolor',
            get_string('textcolor', 'local_ivinlineannotation') .
                '<span class="color-picker iv-ml-2" style="background-color: '
                . $this->optional_param('textcolor', '#fff', PARAM_TEXT) .
                '"><input type="color"></span>',
            ['size' => 100]
        );
        $mform->setType('textcolor', PARAM_TEXT);
        $mform->setDefault('textcolor', '#fff');

        $mform->addElement('text', 'textfont', get_string('textfont', 'local_ivinlineannotation'), ['size' => 100]);
        $mform->setType('textfont', PARAM_TEXT);

        $mform->addElement(
            'text',
            'bgcolor',
            get_string('bgcolor', 'local_ivinlineannotation') .
                '<span class="color-picker iv-ml-2" style="background-color: ' .
                $this->optional_param('bgcolor', 'rgba(0,0,0,0.3)', PARAM_TEXT) .
                '"><input type="color"></span>',
            ['size' => 100]
        );
        $mform->setType('bgcolor', PARAM_TEXT);
        $mform->setDefault('bgcolor', 'rgba(0,0,0,0.3)');

        $mform->addElement('text', 'bordercolor', get_string('bordercolor', 'local_ivinlineannotation') .
            '<span class="color-picker iv-ml-2" style="background-color: ' .
            $this->optional_param('bordercolor', 'transparent', PARAM_TEXT) .
            '"><input type="color"></span>', ['size' => 100]);
        $mform->setType('bordercolor', PARAM_TEXT);
        $mform->setDefault('bordercolor', 'transparent');

        $mform->addElement('text', 'borderwidth', get_string('borderwidth', 'local_ivinlineannotation'), ['size' => 100]);
        $mform->setType('borderwidth', PARAM_INT);
        $mform->addRule('borderwidth', get_string('numeric', 'mod_interactivevideo'), 'numeric', null, 'client');
        $mform->addRule('borderwidth', get_string('maximum', 'mod_interactivevideo', 5), 'maxlength', 5, 'client');
        $mform->addRule('borderwidth', get_string('minimum', 'mod_interactivevideo', 0), 'minlength', 0, 'client');
        $mform->setDefault('borderwidth', 1);

        $mform->addElement('hidden', 'resizable', 0);

        $this->set_display_vertical();
    }

    /**
     * Processes dynamic submission
     * @return object
     */
    public function process_dynamic_submission() {
        $fromform = $this->get_data();
        $fromform->formattedlabel = format_string($fromform->label);
        return $fromform;
    }

    /**
     * Validates form data
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
     * @return \moodle_url
     */
    protected function get_page_url_for_dynamic_submission(): \moodle_url {
        return new \moodle_url('/mod/interactivevideo/interactions.php', [
            'id' => $this->optional_param('annotationid', null, PARAM_INT),
        ]);
    }
}

