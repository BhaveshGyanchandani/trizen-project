// Backend may return Mongo's `_id` or a serialized `id` depending on the
// controller. Normalize once here rather than sprinkling `?? _id` everywhere.
export function idOf(obj) {
  if (!obj) return undefined;
  return obj.id ?? obj._id;
}
