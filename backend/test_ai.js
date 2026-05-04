const classifierService = require('./src/services/classifierService');

async function run() {
  const items = [
    { name: 'Paneer Tikka', price: 220 },
    { name: 'Chicken Biryani', price: 280 },
    { name: 'Coke', price: 50 },
    { name: 'Mushroom Risotto', price: 400 },
    { name: 'Omelette', price: 100 }
  ];

  console.log('Classifying items...');
  const classified = await classifierService.classifyItems(items);
  console.log(JSON.stringify(classified, null, 2));
}

run();
