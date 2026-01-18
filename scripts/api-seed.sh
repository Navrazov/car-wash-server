#!/bin/bash
API="http://localhost:3001/api"

echo "🌱 Seeding database via API..."

# Create locations
echo "Creating locations..."
curl -s -X POST "$API/admin/locations" \
  -H "Content-Type: application/json" \
  -d '{"name":"Автомойка на Ленина","address":"ул. Ленина, 45","phone":"+7 (999) 123-45-67","workingHours":"9:00 - 21:00","description":"Современная автомойка в центре города"}' > /dev/null

curl -s -X POST "$API/admin/locations" \
  -H "Content-Type: application/json" \
  -d '{"name":"Автомойка на Гагарина","address":"пр. Гагарина, 12","phone":"+7 (999) 765-43-21","workingHours":"8:00 - 22:00","description":"Быстрая мойка и детейлинг"}' > /dev/null

curl -s -X POST "$API/admin/locations" \
  -H "Content-Type: application/json" \
  -d '{"name":"Автомойка на Мира","address":"ул. Мира, 78","phone":"+7 (999) 111-22-33","workingHours":"9:00 - 20:00","description":"Профессиональная мойка и полировка"}' > /dev/null

echo "✅ Locations created"

# Create services
echo "Creating services..."
curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Экспресс-мойка","description":"Быстрая мойка кузова снаружи","price":500,"duration":30,"category":"wash"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Стандартная мойка","description":"Мойка кузова снаружи и внутри салона","price":1000,"duration":60,"category":"wash"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Комплексная мойка","description":"Полная мойка + чернение шин + ароматизация","price":1500,"duration":90,"category":"wash"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Химчистка салона","description":"Глубокая химчистка салона автомобиля","price":3000,"duration":180,"category":"detailing"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Полировка кузова","description":"Профессиональная полировка кузова","price":5000,"duration":240,"category":"detailing"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Нанесение воска","description":"Защитное покрытие воском","price":1200,"duration":60,"category":"maintenance"}' > /dev/null

curl -s -X POST "$API/admin/services" \
  -H "Content-Type: application/json" \
  -d '{"name":"Мойка двигателя","description":"Безопасная мойка моторного отсека","price":800,"duration":45,"category":"maintenance"}' > /dev/null

echo "✅ Services created"
echo ""
echo "🎉 Database seeded successfully!"
echo ""
echo "📋 Admin credentials:"
echo "   Login: admin"
echo "   Password: admin123"
