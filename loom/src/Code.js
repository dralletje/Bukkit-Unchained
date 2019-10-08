import React from "react";
import styled from "styled-components";

import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/plugins/line-highlight/prism-line-highlight.css";
import "prismjs/components/prism-jsx.min.js";
import "prismjs/components/prism-bash.min.js";
import "prismjs/components/prism-scss.min.js";
import "prismjs/components/prism-css.min.js";
import "prismjs/components/prism-elixir.min.js";
import "prismjs/components/prism-ruby.min.js";

// CSS
import "prismjs/plugins/line-highlight/prism-line-highlight.css";

import brace from "brace";
import AceEditor from "react-ace";

import "brace/mode/javascript";
import "brace/theme/solarized_dark";

import { Flex } from "./Elements.js";

let AceTheme = styled.div`
  .ace_editor {
    height: 100%;
  }

  .ace_editor .ace_marker-layer {
    .ace_bracket,
    .ace_selected-word {
      display: none;
    }

    .ace_selection {
      margin-left: -2px;
      margin-right: -2px;
      padding-right: 2px;
      padding-left: 2px;
    }
  }

  .ace_print-margin {
    display: none;
  }

  .ace-solarized-dark {
    .ace_cursor {
      color: #d0d0d0;
    }

    .ace_identifier {
      color: #65b2ff;
    }

    /* I'm assuming '.ace_punctuation.ace_operator' is a '.' */
    .ace_punctuation.ace_operator + .ace_identifier {
      color: rgb(0, 133, 255);
    }

    .ace_constant.ace_numeric,
    .ace_constant.ace_boolean,
    .ace_string {
      /* color: #00c5b6; */
      color: #690;
    }

    .ace_keyword {
      color: #073642;
    }

    .ace_paren,
    .ace_punctuation,
    .ace_storage,
    .ace_keyword {
      color: #a7a7a7;
    }

    .ace_variable {
      color: rgb(205, 113, 255);
    }

    .ace_language {
      color: #ff5656 !important;
    }
  }
`;

let Code = styled.pre`
  display: block;
  padding: 16px !important;
  background-color: white !important;
  margin: 0 !important;

  /* & + & {
    border-top: solid 1px rgb(247, 248, 249);
  } */
`;

class PrismCodeBlock extends React.Component {
  code_element_ref = null;

  componentDidMount() {
    Prism.highlightElement(this.code_element_ref);
  }

  componentDidUpdate() {
    Prism.highlightElement(this.code_element_ref);
  }

  render() {
    let { value, ...props } = this.props;
    return (
      <Code
        className="language-js"
        ref={(ref) => {
          this.code_element_ref = ref;
        }}
        {...props}
      >
        <code>{value}</code>
      </Code>
    );
  }
}

let hover = (fn) => {
  return {
    onMouseEnter() {
      fn(true);
    },
    onMouseLeave() {
      fn(false);
    },
  };
};

let AceCodeblock = ({
  value,
  onChange = () => {},
  readOnly = false,
  innerRef = () => {},
  ...props,
}) => {
  return (
    <AceTheme style={{ flex: 1 }}>
      <AceEditor
        {...props}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        showGutter={false}
        wrapEnabled={true}
        setOptions={{
          highlightActiveLine: false,
          useSoftTabs: true,
          maxLines: Infinity,
          // lineHeight: 24,
        }}
        ref={(ref) => {
          if (ref != null) {
            let { editor } = ref;
            editor.container.style.lineHeight = "24px";
            editor.renderer.updateFontSize();
            editor.$blockScrolling = Infinity;
            innerRef(editor);
          } else {
            innerRef(null);
          }
        }}
        lineHeight={24}
        mode="javascript"
        theme="solarized_dark"
        fontSize={16}
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: "transparent",
          fontFamily: `cousine,sfmono-regular,Consolas,Menlo,liberation mono,ubuntu mono,Courier,monospace`,
        }}
      />
    </AceTheme>
  );
};

export class Codeblock extends React.Component {
  ace_editor = null;

  componentDidUpdate(prevProps, prevState) {
    if (this.props.editting === true && prevProps.editting === false) {
      let editor = this.ace_editor;
      editor.focus();
      editor.navigateFileEnd();
    }
  }

  render() {
    let { value, onChange, editting, ...props } = this.props;

    if (editting) {
      return (
        <Flex row style={{ flex: 1 }} onClick={() => {
          this.ace_editor.focus();
        }}>
          <AceCodeblock
            {...props}
            value={value}
            onChange={(new_code) => {
              onChange(new_code)
            }}
            innerRef={(editor) => {
              if (editor) {
                editor.renderer.$cursorLayer.element.style.display = "block";
              }
              this.ace_editor = editor;
            }}
          />
        </Flex>
      );
    } else {
      return (
        <Flex row style={{ flex: 1 }} onClick={() => {
          this.ace_editor.focus();
        }}>
          <AceCodeblock
            {...props}
            value={value}
            readOnly={true}
            innerRef={(editor) => {
              if (editor) {
                editor.renderer.$cursorLayer.element.style.display = "none";
              }
              this.ace_editor = editor;
            }}
          />
        </Flex>
      );
    }
  }
}
