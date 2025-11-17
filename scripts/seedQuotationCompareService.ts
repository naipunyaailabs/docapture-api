import DatabaseService from '../services/database';
import serviceService from '../services/serviceService';

async function seedQuotationCompareService() {
  try {
    console.log('🌱 Starting to seed Quotation Compare service...');
    
    // Connect to database
    await DatabaseService.connect();
    console.log('✅ Connected to database');

    // Check if service already exists
    const existingService = await serviceService.findServiceById('quotation-compare');
    if (existingService) {
      console.log('⚠️  Quotation Compare service already exists in database');
      console.log('   Service ID:', existingService.id);
      console.log('   Service Name:', existingService.name);
      await DatabaseService.disconnect();
      return;
    }

    // Create the Quotation Compare service
    const quotationCompareService = {
      id: 'quotation-compare',
      slug: 'quotation-compare',
      name: 'Quotation Comparison',
      description: 'Upload multiple vendor quotations and get AI-powered comparison and recommendations',
      longDescription: 'Upload 2-10 quotations from different vendors and receive a comprehensive side-by-side comparison analysis in markdown format. Our AI evaluates pricing, terms, delivery schedules, product specifications, and quality to provide clear recommendations on the best vendor for your needs. Perfect for procurement decisions and vendor selection.',
      endpoint: '/compare-quotations',
      supportedFormats: ['markdown'],
      supportedFileTypes: ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.txt'],
      icon: 'BarChart3',
      category: 'Analysis',
      fileFieldName: 'documents',
      isActive: true
    };

    const createdService = await serviceService.createService(quotationCompareService);
    
    if (createdService) {
      console.log('✅ Quotation Compare service seeded successfully!');
      console.log('   Service ID:', createdService.id);
      console.log('   Service Name:', createdService.name);
      console.log('   Endpoint:', createdService.endpoint);
      console.log('   Category:', createdService.category);
    } else {
      console.error('❌ Failed to create Quotation Compare service');
    }

    // Disconnect from database
    await DatabaseService.disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error seeding Quotation Compare service:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedQuotationCompareService()
  .then(() => {
    console.log('✨ Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
