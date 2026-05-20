import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Shield, Zap, CreditCard, ArrowRight, TrendingDown, RefreshCw, Package, Camera, Cpu } from 'lucide-react';
import { useBNPL } from '../hooks/useBNPL';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import Logo from '../components/Logo';
import { DEMO_PRODUCT } from '../types';
import pricingService, { BlendRate } from '../services/pricingService';

export function CheckoutPage() {
  const { state, actions } = useBNPL();
  const navigate = useNavigate();
  const product = state.product || DEMO_PRODUCT;
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [blendRate, setBlendRate] = useState<BlendRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [maxInstallments, setMaxInstallments] = useState<number>(4);

  const productImages = [
    '/samsung-s25-ultra-main.jpg',
    '/samsung-s25-ultra-front-back.jpg',
    '/samsung-s25-ultra-details.jpg',
    '/samsung-s25-ultra-angle1.jpg',
    '/samsung-s25-ultra-angle2.jpg'
  ];

  useEffect(() => {
    const fetchBlendRates = async () => {
      setLoading(true);
      try {
        // Simulate Blend Pool decision on max installments (2-4 randomly)
        const poolMaxInstallments = Math.floor(Math.random() * 3) + 2; // Random between 2-4
        setMaxInstallments(poolMaxInstallments);
        
        const rates = await pricingService.getBlendRates();
        setBlendRate(rates);
      } catch (error) {
        console.error('Error fetching Blend rates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlendRates();
    // Refresh rates every 30 seconds
    const interval = setInterval(fetchBlendRates, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBNPLClick = () => {
    actions.setProduct(product);
    actions.setStep('quotation');
    navigate('/quotation');
  };

  const features = [
    {
      icon: Shield,
      title: 'Safe & Reliable',
      description: 'Transactions protected by Stellar blockchain'
    },
    {
      icon: Zap,
      title: 'Instant Approval', 
      description: 'No paperwork, approval in seconds'
    },
    {
      icon: Star,
      title: 'Competitive Rates',
      description: 'Low APR powered by Blend Protocol DeFi pools'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Modern Header */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:items-start">
          {/* Product Showcase */}
          <div className="space-y-6">
            {/* Main Product Image */}
            <Card className="overflow-hidden">
              <div className="aspect-square relative bg-gradient-to-br from-muted/20 to-muted/5">
                <div className="absolute top-4 right-4 z-10">
                  <Badge variant="secondary">Trending</Badge>
                </div>
                <img 
                  src={productImages[selectedImageIndex]} 
                  alt={product.name}
                  className="w-full h-full object-contain p-8"
                />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg p-3">
                    <p className="text-foreground font-medium text-sm">{product.name}</p>
                    <p className="text-muted-foreground text-xs">Titanium Black - 256GB</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Thumbnail Gallery */}
            <div className="grid grid-cols-5 gap-3">
              {productImages.map((image, index) => (
                <Card 
                  key={index} 
                  className={`aspect-square overflow-hidden cursor-pointer transition-all ${
                    selectedImageIndex === index 
                      ? 'ring-2 ring-primary border-primary' 
                      : 'hover:ring-2 hover:ring-primary/20 border-border'
                  }`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </Card>
              ))}
            </div>
          </div>

          {/* Product Details */}
          <div className="mt-10 lg:mt-0 space-y-8">
            {/* Header */}
            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">
                  {product.name}
                </h1>
                <p className="text-lg text-muted-foreground mt-2">
                  256GB • 12GB RAM • 200MP Camera • 6.9" Screen • Snapdragon 8 Elite • S Pen
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-muted-foreground">USDC</span>
                  <span className="text-4xl font-bold text-foreground">
                    {(parseFloat(product.price) / 5.7).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center">
                  {[0, 1, 2, 3, 4].map((rating) => (
                    <Star
                      key={rating}
                      className="w-5 h-5 fill-primary text-primary"
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">5.0 (256 reviews)</span>
              </div>
            </div>

            {/* Product Details Accordion */}
            <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="description" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4" />
                        <span>Product Description</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {product.description}
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="specifications" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4" />
                        <span>Technical Specifications</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Performance</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Display: 6.9" Dynamic AMOLED 2X</li>
                            <li>• Storage: 256GB</li>
                            <li>• RAM: 12GB</li>
                            <li>• Connectivity: 5G</li>
                            <li>• Processor: Snapdragon 8 Gen 3</li>
                            <li>• Battery: 5000mAh</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Features</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• S Pen included</li>
                            <li>• IP68 water resistance</li>
                            <li>• Wireless charging</li>
                            <li>• Samsung DeX support</li>
                            <li>• Ultrasonic fingerprint</li>
                            <li>• Titanium frame</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cameras" className="border-b-0">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center space-x-2">
                        <Camera className="w-4 h-4" />
                        <span>Camera System</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Rear Cameras</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Main: 200MP with OIS</li>
                            <li>• Ultra-wide: 50MP (120°)</li>
                            <li>• Telephoto 1: 10MP (3x optical)</li>
                            <li>• Telephoto 2: 50MP (5x optical)</li>
                            <li>• 100x Space Zoom</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-2">Video & Front</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Front: 12MP autofocus</li>
                            <li>• 8K video recording</li>
                            <li>• Super Steady video</li>
                            <li>• Night mode (all lenses)</li>
                            <li>• Expert RAW support</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            {/* Payment Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Choose Payment Method</h3>
              
              {/* Traditional Payment */}
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-between h-14"
                disabled
              >
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-3" />
                  <span>Pay Full Amount</span>
                </div>
                <span className="font-semibold">BRL {parseFloat(product.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </Button>

              {/* BNPL Payment */}
              <Button
                size="lg"
                className="w-full justify-between h-14 bg-primary hover:bg-primary/90 text-primary-foreground relative overflow-hidden group"
                onClick={handleBNPLClick}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center relative z-10">
                  <Zap className="w-5 h-5 mr-3" />
                  <span className="font-semibold">Pay with SyloPay</span>
                </div>
                <ArrowRight className="w-5 h-5 relative z-10" />
              </Button>

              <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <span>Split in up to {maxInstallments}x</span>
                <span>•</span>
                <span className="flex items-center">
                  {loading ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : blendRate ? (
                    <>
                      <TrendingDown className="w-3 h-3 mr-1 text-green-500" />
                      <span className="font-semibold text-foreground">
                        {blendRate.borrowRate.toFixed(1)}% APR
                      </span>
                    </>
                  ) : (
                    "Low rates"
                  )}
                </span>
                <span>•</span>
                <span>Instant approval</span>
              </div>
              
              {/* Dynamic Rate Badge */}
              {blendRate && (
                <div className="mt-3 flex justify-center">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20">
                    <TrendingDown className="w-3 h-3 mr-1" />
                    Rate powered by Blend Protocol • {blendRate.utilization.toFixed(0)}% pool utilization
                  </Badge>
                </div>
              )}
            </div>

            {/* Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Choose SyloPay BNPL?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {feature.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;