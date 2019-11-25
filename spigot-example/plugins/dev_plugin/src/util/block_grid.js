let fr = (value) => {
  return { unit: 'fr', value: value }
}
let grid = (strings, ...sizes) => {
  return ({ height: total_height, width: total_width }) => {
    let string = strings.join(' ');

    let lines = string.split('\n').map(x => x.trim()).filter(Boolean);
    // console.log(`lines:`, lines)
    let column_count = lines[0].split(' ').filter(Boolean).length;

    if (sizes.length !== lines.length + column_count) {
      // prettier-ignore
      // console.log(`sizes.length:`, sizes.length);
      // console.log(`column_count:`, column_count);
      // console.log(`lines.length:`, lines.length)
      throw new Error(`Sizes does not match the amount of columns and lines`);
    }

    let line_heights = sizes.slice(0, lines.length);
    let column_widths = sizes.slice(lines.length);

    // console.log(`line_heights:`, line_heights);
    // console.log(`column_widths:`, column_widths)

    let line_height_taken = line_heights.filter(x => typeof x === 'number').reduce(((a, x) => a + x), 0);
    let line_height_reserved = line_heights.filter(x => x.unit === 'fr').map(x => x.value).reduce(((a, x) => a + x), 0);
    let fr_height = (total_height - line_height_taken) / line_height_reserved;

    let column_width_taken = column_widths.filter(x => typeof x === 'number').reduce(((a, x) => a + x), 0);
    let column_width_reserved = column_widths.filter(x => x.unit === 'fr').map(x => x.value).reduce(((a, x) => a + x), 0);
    let fr_width = (total_width - column_width_taken) / column_width_reserved;

    // console.log(`line_height_taken:`, line_height_taken);
    // console.log(`line_height_reserved:`, line_height_reserved);
    // console.log(`fr_height:`, fr_height);
    //
    // console.log(`column_width_taken:`, column_width_taken);
    // console.log(`column_width_reserved:`, column_width_reserved);
    // console.log(`fr_width:`, fr_width);

    let regions = [];
    let current_vertical_position = 0;
    for (let [line_index, line] of Object.entries(lines)) {
      let columns = line.split(' ').filter(Boolean);
      if (columns.length !== column_count) {
        // prettier-ignore
        throw new Error(`Found a line with a different column count than the first line`);
      }

      let height = typeof line_heights[line_index] === 'number' ? line_heights[line_index] : line_heights[line_index].value * fr_height;

      let current_horizontal_position = 0;
      for (let [column_index, cell] of Object.entries(columns)) {
        let width = typeof column_widths[column_index] === 'number' ? column_widths[column_index] : column_widths[column_index].value * fr_width;
        regions.push({
          name: cell,
          from: {
            horizontal: current_horizontal_position,
            vertical: current_vertical_position,
          },
          to: {
            horizontal: current_horizontal_position + width,
            vertical: current_vertical_position + height,
          }
        });
        current_horizontal_position = current_horizontal_position + width;
      }
      current_vertical_position = current_vertical_position + height;
    }
    return regions;
  }
}

module.exports = { fr, grid };

if (module.webpackPolyfill !== 1 && module.parent == null) {
  console.log(`module.parent:`, module)

  let fn = grid`
    black     red    black ${fr(1)}
    red       red      red ${2}
    black     red    black ${fr(1)}
    ${fr(1)} ${2} ${fr(1)}
  `;

  let regions = fn({ height: 16, width: 16 });
  // console.log(`regions:`, regions)
}
