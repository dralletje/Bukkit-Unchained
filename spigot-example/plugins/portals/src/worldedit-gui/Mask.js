let get_private_property = (object, field_name) => {
  try {
    let field = object.getClass().getDeclaredField(field_name);
    field.setAccessible(true);
    return field.get(object);
  } catch (error) {
    console.log(`Error while taking ${field_name} from `, object);
    console.log(error)
  }
};

let masks = {
  "com.sk89q.worldedit.function.mask.MaskUnion": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.MaskUnion",
        masks: Java.from(mask.getMasks().toArray())
          .map(x => {
            return from_java(x);
          })
          .filter(Boolean)
      };
    },
    to_java: mask => {
      // prettier-ignore
      let MaskUnion = Java_type("com.sk89q.worldedit.function.mask.MaskUnion");
      let masks = mask.masks.map(x => to_java(x)).filter(Boolean);

      if (masks.length === 1) {
        return masks[0];
      } else {
        return new MaskUnion(masks)
      }
    },
  },
  "com.sk89q.worldedit.function.mask.MaskIntersection": {
    from_java: mask => {
      let masks = Java.from(get_private_property(mask, "masks").toArray())
        .map(x => {
          return from_java(x);
        })
        .filter(Boolean);

      return {
        type: "com.sk89q.worldedit.function.mask.MaskIntersection",
        masks: masks,
      };
    },
    to_java: mask => {
      let MaskIntersection = Java_type(
        "com.sk89q.worldedit.function.mask.MaskIntersection"
      );
      return new MaskIntersection(mask.masks.map(x => to_java(x)));
    }
  },
  "com.sk89q.worldedit.function.mask.ExistingBlockMask": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.ExistingBlockMask",
        extent: mask.getExtent()
      };
    },
    to_java: mask => {
      let ExistingBlockMask = Java_type(
        "com.sk89q.worldedit.function.mask.ExistingBlockMask"
      );
      return new ExistingBlockMask(mask.extent);
    }
  },
  "com.sk89q.worldedit.function.mask.SolidBlockMask": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.SolidBlockMask",
        extent: mask.getExtent()
      };
    },
    to_java: mask => {
      let SolidBlockMask = Java_type(
        "com.sk89q.worldedit.function.mask.SolidBlockMask"
      );
      return new SolidBlockMask(mask.extent);
    }
  },
  "com.sk89q.worldedit.function.mask.BlockMask": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.BlockMask",
        extent: mask.getExtent(),

        blocks: Java.from(mask.getBlocks().toArray())
      };
    },
    to_java: mask => {
      let BlockMask = Java_type("com.sk89q.worldedit.function.mask.BlockMask");
      return new BlockMask(mask.extent, mask.blocks);
    }
  },
  "com.sk89q.worldedit.function.mask.BlockCategoryMask": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.BlockCategoryMask",
        extent: mask.getExtent(),

        category: get_private_property(mask, "category")
      };
    },
    to_java: mask => {
      let BlockCategoryMask = Java_type(
        "com.sk89q.worldedit.function.mask.BlockCategoryMask"
      );
      return new BlockCategoryMask(mask.extent, mask.category);
    }
  },
  "com.sk89q.worldedit.function.mask.OffsetMask": {
    from_java: mask => {
      let sub_mask = get_private_property(mask, "mask");
      let offset = get_private_property(mask, "offset");

      return {
        type: "com.sk89q.worldedit.function.mask.OffsetMask",
        offset: {
          x: offset.getX(),
          y: offset.getY(),
          z: offset.getZ()
        },
        mask: from_java(sub_mask)
      };
    },
    to_java: mask => {
      let OffsetMask = Java_type(
        "com.sk89q.worldedit.function.mask.OffsetMask"
      );
      let BlockVector3 = Java_type("com.sk89q.worldedit.math.BlockVector3");
      let vector = BlockVector3.static.at(mask.offset.x, mask.offset.y, mask.offset.z);
      return new OffsetMask(to_java(mask.mask), vector);
    }
  },
  "com.sk89q.worldedit.function.mask.Masks$1": {
    from_java: mask => {
      return {
        type: "com.sk89q.worldedit.function.mask.Masks$1",
        mask: from_java(get_private_property(mask, "val$mask"))
      };
    },
    to_java: mask => {
      let Masks = Java_type("com.sk89q.worldedit.function.mask.Masks");
      return Masks.static.negate(to_java(mask.mask));
    }
  },
  'null': { to_java: () => null }
};

export let from_java = mask => {
  if (mask == null) {
    return {
      type: 'null',
    };
  }

  let mask_converter = masks[mask.getClass().getName()];
  if (mask_converter == null) {
    console.log(`mask:`, mask);
    console.log(`No getter found for class "${mask.getClass().getName()}"`);
    return null;
  }
  return mask_converter.from_java(mask);
};
export let to_java = mask => {
  let mask_converter = masks[mask.type];
  if (mask_converter == null) {
    console.log(`mask:`, mask);
    console.log(`No setter found for class "${mask.type}"`);
    return null;
  }
  return mask_converter.to_java(mask);
};
