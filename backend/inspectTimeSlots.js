const prisma = require("./src/config/prisma");

(async () => {
  try {
    await prisma.$connect();
    // Kiểm tra dữ liệu giờ slot trong bảng time_slots
    const timeSlots = await prisma.time_slots.findMany({
      orderBy: { slot_id: "asc" }
    });
    console.log("Dữ liệu bảng time_slots:");
    timeSlots.forEach(slot => {
      console.log(`Slot ${slot.slot_id}: ${slot.start_time?.toISOString().slice(11,16)} - ${slot.end_time?.toISOString().slice(11,16)}`);
    });

    // Kiểm tra kết nối giữa timetable và time_slots
    const sampleTimetable = await prisma.timetable.findMany({
      take: 5,
      include: { time_slots: true }
    });
    console.log("\nMẫu dữ liệu timetable + time_slots:");
    sampleTimetable.forEach(item => {
      console.log(`Lớp ${item.classes} - Slot ${item.slot_id}: Giờ ${item.time_slots?.start_time?.toISOString().slice(11,16)}`);
    });
  } catch (err) {
    console.error("Lỗi kiểm tra time_slots:", err);
  } finally {
    await prisma.$disconnect();
  }
})();