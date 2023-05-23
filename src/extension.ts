import * as vscode from 'vscode';

class TreeNode extends vscode.TreeItem {
  children?: TreeNode[];
  line?: number;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    line?: number,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
    this.line = line;
  }

  addChildren(...children: TreeNode[]): void {
    if (!this.children) {
      this.children = [];
    }

    this.children.push(...children);
  }

  getChildrens(): TreeNode[] | undefined {
    return this.children;
  }
}

const getEditorContent = (): string => {
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    return '';
  }

  return editor.document.getText();
};

// ref: https://github.com/JunTaeHahm/region-tree-view/blob/main/extension.js#LL87C27-L87C27
const getTreeData = (content: string): TreeNode[] => {
  const lines = content.split(/\r?\n/);
  const treeData: TreeNode[] = [];
  const stack: TreeNode[] = [];
  let isInHtmlComment = false;

  lines.forEach((line, index) => {
    if (line.includes('<!--')) {
      isInHtmlComment = true;
    }

    if (line.includes('-->')) {
      isInHtmlComment = false;
    }

    if (!isInHtmlComment) {
      const regionMatch = line.match(/#region\s+(.*?)(\s*\*\/|\s*-->|\s*)$/i);
      const endregionMatch = line.match(/#endregion/);

      if (regionMatch) {
        const label = regionMatch[1] || `Region ${treeData.length + 1}`;

        const treeNode = new TreeNode(label, vscode.TreeItemCollapsibleState.Collapsed, index);

        if (stack.length > 0) {
          const parent = stack[stack.length - 1];
          parent.addChildren(treeNode);
        } else {
          treeData.push(treeNode);
        }

        stack.push(treeNode);
      } else if (endregionMatch) {
        stack.pop();
      }
    }
  });

  if (treeData.length === 0) {
    const noRegionsNode: TreeNode = new TreeNode("No regions detected", vscode.TreeItemCollapsibleState.None);

    treeData.push(noRegionsNode);
  }

  return treeData;
};

class TreeDataProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | undefined | void> = new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeNode | undefined | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): vscode.ProviderResult<TreeNode[]> {
    if (element) {
      return element.getChildrens();
    }

    const content = getEditorContent();
    const treeData = getTreeData(content);
    return treeData;
  }

  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire();
  }
}

export function activate(context: vscode.ExtensionContext) {
  const treeDataProvider = new TreeDataProvider();

  const treeView = vscode.window.createTreeView('regionsToc', {
    treeDataProvider,
    showCollapseAll: true,
  });

  treeView.onDidChangeSelection((e) => {
    const selectedNodes = e.selection;

    if (selectedNodes.length === 0) {
      return;
    }

    const selectedNode = selectedNodes[0];

    if (selectedNode?.line === undefined) {
      return;
    }

    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    const pos = new vscode.Position(selectedNode.line, 0);

    editor.selection = new vscode.Selection(pos, pos);
    
    editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
  });

  vscode.window.onDidChangeActiveTextEditor(() => {
    treeDataProvider.refresh();
  });

  vscode.workspace.onDidChangeTextDocument(event => {
    if (event.document === vscode.window.activeTextEditor?.document) {
      treeDataProvider.refresh();
    }
  });

  // 최초 포커스된 편집기가 있을 경우
  const activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    treeDataProvider.refresh();
  }

  // refresh 커맨드 등록
	let disposable = vscode.commands.registerCommand('vscode-region-toc.refresh', () => {
    treeDataProvider.refresh();
	});

  vscode.window.showInformationMessage('🎉 Vscode Region Toc 확장이 준비되었습니다. 🎉');

	context.subscriptions.push(disposable);
}

export function deactivate() {}
