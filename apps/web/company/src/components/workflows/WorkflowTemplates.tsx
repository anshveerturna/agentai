import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Sparkles, Zap, Database, MessageCircle, Globe, FileText } from 'lucide-react';

interface WorkflowTemplatesProps {
  onSelectTemplate: () => void;
}

const templates = [
  {
    id: '1',
    name: 'Customer Support Automation',
    description: 'Automatically route and respond to customer inquiries with AI',
    category: 'Customer Service',
    complexity: 'Beginner',
    estimatedTime: '10 min',
    icon: MessageCircle,
    color: 'bg-blue-500',
  features: ['AI Chatbot', 'Ticket Routing', 'Auto-responses']
  },
  {
    id: '2',
    name: 'Data Pipeline & Analytics',
    description: 'Extract, transform, and load data from multiple sources',
    category: 'Data Processing',
    complexity: 'Advanced',
    estimatedTime: '30 min',
    icon: Database,
    color: 'bg-green-500',
  features: ['ETL Pipeline', 'Data Validation', 'Reporting']
  },
  {
    id: '3',
    name: 'Social Media Automation',
    description: 'Schedule posts and monitor engagement across platforms',
    category: 'Marketing',
    complexity: 'Intermediate',
    estimatedTime: '20 min',
    icon: Globe,
    color: 'bg-purple-500',
  features: ['Content Scheduling', 'Analytics', 'Multi-platform']
  },
  {
    id: '4',
    name: 'Document Processing',
    description: 'Extract and process information from documents using AI',
    category: 'Document Management',
    complexity: 'Intermediate',
    estimatedTime: '15 min',
    icon: FileText,
    color: 'bg-orange-500',
  features: ['OCR', 'AI Extraction', 'Validation']
  },
  {
    id: '5',
    name: 'E-commerce Order Flow',
    description: 'Complete order processing from payment to fulfillment',
    category: 'E-commerce',
    complexity: 'Advanced',
    estimatedTime: '45 min',
    icon: Zap,
    color: 'bg-indigo-500',
  features: ['Payment Processing', 'Inventory', 'Shipping']
  },
  {
    id: '6',
    name: 'AI Content Generator',
    description: 'Generate and publish content using advanced AI models',
    category: 'Content Creation',
    complexity: 'Beginner',
    estimatedTime: '5 min',
    icon: Sparkles,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
  features: ['GPT Integration', 'Auto Publishing', 'SEO Optimization']
  }
];

const complexityColors = {
  'Beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Advanced': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

export function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {templates.map((template) => {
        const Icon = template.icon;
        return (
          <div key={template.id} className="group relative bg-card rounded-xl border border-border/50 p-6 hover:border-border hover:shadow-lg transition-all duration-200 cursor-pointer">
            {/* Popular Badge removed for a cleaner, more professional look */}

            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${template.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
                <p className="text-muted-foreground text-sm">{template.category}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {template.description}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-2 mb-4">
              <Badge className={complexityColors[template.complexity as keyof typeof complexityColors]}>
                {template.complexity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {template.estimatedTime}
              </Badge>
            </div>

            {/* Features */}
            <div className="mb-6">
              <div className="text-xs font-medium text-muted-foreground mb-2">Features:</div>
              <div className="flex flex-wrap gap-1">
                {template.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action */}
            <Button 
              onClick={onSelectTemplate}
              className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
              variant="outline"
            >
              Use Template
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
