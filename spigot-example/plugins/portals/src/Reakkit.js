let { precondition } = require('./util.js');

let React = {
  Component: class ReactComponent {
    constructor(props, context) {
      this.props = props;
      this.state = {}; // TODO Change this to `null` to reflect real React
      this.context = context;
    }
  },

  render_single_instance: (instance = null, element) => {
    if (instance != null) {
      if (element == null) {
        // Deleted
        instance.componentDidUnmount();
        return null
      }

      // Updated
      let { type, key, ...props } = element;
      precondition(instance instanceof type);
      // TODO shallow equal props?
      let prevProps = instance.props;
      instance.props = props;
      instance.componentDidUpdate(prevProps);
      return instance;
    } else {
      if (element == null) {
        // Never existed;
        return null;
      }

      // Created
      let { type, key, ...props } = element;
      let instance = new type(props);
      instance.componentDidMount();

      return instance;
      // has_rendered[entity.key] = instance;
    }
  }
};

module.exports = React;
