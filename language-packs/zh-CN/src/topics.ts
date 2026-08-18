import type { Topic } from "../../../packages/content-schema/src/index.js";

/** Stable topic ontology for the Chinese pack. */
let order = 0;
const next = () => (order += 1);

function topic(
  id: string,
  parentId: string | null,
  vi: string,
  en: string,
  icon?: string
): Topic {
  return { id, parentId, order: next(), label: { "vi-VN": vi, "en-US": en }, icon };
}

export const topics: Topic[] = [
  /* Roots ---------------------------------------------------------- */
  topic("daily-life", null, "Đời sống hằng ngày", "Daily life", "☀️"),
  topic("people", null, "Con người & quan hệ", "People & relationships", "👥"),
  topic("food", null, "Ăn uống", "Food & drink", "🍜"),
  topic("shopping", null, "Mua sắm", "Shopping", "🛍️"),
  topic("travel", null, "Di chuyển & du lịch", "Transport & travel", "✈️"),
  topic("health", null, "Sức khoẻ", "Health", "🩺"),
  topic("education", null, "Học tập", "Education", "🎓"),
  topic("work", null, "Công việc", "Work", "💼"),
  topic("services", null, "Dịch vụ", "Services", "🛎️"),
  topic("technology", null, "Công nghệ", "Technology", "💻"),
  topic("leisure", null, "Giải trí & thể thao", "Leisure & sport", "🎬"),
  topic("society", null, "Văn hoá & xã hội", "Culture & society", "🏛️"),
  topic("world", null, "Khoa học & thế giới", "Science & the world", "🌍"),

  /* Daily life ----------------------------------------------------- */
  topic("daily-life.greetings", "daily-life", "Chào hỏi", "Greetings", "👋"),
  topic("daily-life.courtesy", "daily-life", "Cảm ơn & xin lỗi", "Thanks & apologies", "🙏"),
  topic("daily-life.numbers", "daily-life", "Số đếm", "Numbers", "🔢"),
  topic("daily-life.time", "daily-life", "Thời gian", "Time", "🕐"),
  topic("daily-life.routine", "daily-life", "Sinh hoạt hằng ngày", "Daily routine", "🔁"),

  /* People --------------------------------------------------------- */
  topic("people.introductions", "people", "Giới thiệu bản thân", "Introductions", "🙋"),
  topic("people.family", "people", "Gia đình", "Family", "👨‍👩‍👧"),
  topic("people.friends", "people", "Bạn bè", "Friends", "🤝"),

  /* Food ----------------------------------------------------------- */
  topic("food.drinks", "food", "Đồ uống", "Drinks", "🥤"),
  topic("food.cafe", "food", "Quán cà phê", "Cafe", "☕"),
  topic("food.restaurant", "food", "Nhà hàng", "Restaurant", "🍽️"),
  topic("food.restaurant.ordering", "food.restaurant", "Gọi món", "Ordering", "📋"),
  topic("food.restaurant.booking", "food.restaurant", "Đặt bàn", "Booking", "📅"),
  topic("food.restaurant.preferences", "food.restaurant", "Sở thích & dị ứng", "Preferences & allergies", "⚠️"),
  topic("food.restaurant.bill", "food.restaurant", "Thanh toán", "Paying the bill", "🧾"),

  /* Travel --------------------------------------------------------- */
  topic("travel.directions", "travel", "Hỏi đường", "Directions", "🧭"),
  topic("travel.transport", "travel", "Phương tiện", "Transport", "🚌"),
  topic("travel.airport", "travel", "Sân bay", "Airport", "🛫"),
  topic("travel.hotel", "travel", "Khách sạn", "Hotel", "🏨"),

  /* Shopping ------------------------------------------------------- */
  topic("shopping.prices", "shopping", "Giá cả", "Prices", "🏷️"),
  topic("shopping.buying", "shopping", "Chọn & mua hàng", "Choosing & buying", "🛒"),

  /* Health --------------------------------------------------------- */
  topic("health.basic", "health", "Sức khoẻ cơ bản", "Basic health", "❤️‍🩹"),
  topic("health.pharmacy", "health", "Nhà thuốc", "Pharmacy", "💊"),

  /* Work ----------------------------------------------------------- */
  topic("work.office", "work", "Văn phòng", "Office", "🏢"),
  topic("work.meetings", "work", "Cuộc họp", "Meetings", "📊"),

  /* Services ------------------------------------------------------- */
  topic("services.toilet", "services", "Nhà vệ sinh", "Restroom", "🚻"),
  topic("services.help", "services", "Nhờ giúp đỡ", "Asking for help", "🆘")
];
