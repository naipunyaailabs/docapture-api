import DatabaseService from '../services/database';
import serviceService from '../services/serviceService';

async function updateQuotationCompareService() {
  try {
    console.log('🔄 Updating Quotation Compare service...');
    
    await DatabaseService.connect();
    console.log('✅ Connected to database');

    const updates = {
      description: 'Upload multiple vendor quotations and get AI-powered comparison and recommendations',
      longDescription: 'Upload 2-10 quotations from different vendors and receive a comprehensive side-by-side comparison analysis in markdown format. Our AI evaluates pricing, terms, delivery schedules, product specifications, and quality to provide clear recommendations on the best vendor for your needs. Perfect for procurement decisions and vendor selection.',
      supportedFormats: ['markdown']
    };

    const updatedService = await serviceService.updateService('quotation-compare', updates);
    
    if (updatedService) {
      console.log('✅ Service updated successfully!');
      console.log('   Service ID:', updatedService.id);
      console.log('   Description:', updatedService.description);
    } else {
      console.error('❌ Service not found or update failed');
    }

    await DatabaseService.disconnect();
    console.log('✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Error updating service:', error);
    process.exit(1);
  }
}

updateQuotationCompareService()
  .then(() => {
    console.log('✨ Update completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Update failed:', error);
    process.exit(1);
  });
